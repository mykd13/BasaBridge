/**
 * Who may see or change a learner's data (BB-10). Pure rules: no database, no session.
 *
 * Callers pass the signed-in viewer. Until BB-7 lands, the viewer comes from a stub; after it,
 * from `getCurrentUser()`. Every read of learner data goes through this module (AGENTS.md rule 4).
 */

export type Role = 'student' | 'parent';

export interface Viewer {
  id: string;
  role: Role;
}

/** A parent link as stored in `parent_links`, or null when none exists. */
export interface LinkState {
  status: 'pending' | 'active' | 'revoked';
  sharesProgress: boolean;
  sharesAnalysis: boolean;
}

/**
 * Kinds of learner data, grouped by the share flag that opens them to a linked parent.
 * Anything under `never` stays with the student. Parents never get audio (AGENTS.md rule 3).
 */
export const DATA_KINDS = {
  progress: ['level', 'sessions', 'abilities', 'lessons', 'decisions'],
  analysis: ['tries', 'answers'],
  never: ['audio', 'settings', 'consents', 'guardian_approvals', 'link_codes', 'account'],
} as const;

export type DataKind = (typeof DATA_KINDS)[keyof typeof DATA_KINDS][number];

/**
 * read: see the data. write: change it. mark_misheard: flag a word the speech provider got
 * wrong, which a linked parent may do when analysis is shared (WordResult in contracts).
 */
export type Action = 'read' | 'write' | 'mark_misheard';

export type Reason =
  | 'own_data'
  | 'shared_with_parent'
  | 'not_signed_in'
  | 'not_own_data'
  | 'not_linked'
  | 'link_not_active'
  | 'not_shared'
  | 'never_shared'
  | 'parents_cannot_write'
  | 'wrong_kind_for_action'
  | 'unknown_role';

export type Decision = { allowed: true; reason: Reason } | { allowed: false; reason: Reason };

const allow = (reason: Reason): Decision => ({ allowed: true, reason });
const deny = (reason: Reason): Decision => ({ allowed: false, reason });

export function groupOf(kind: DataKind): keyof typeof DATA_KINDS {
  for (const group of Object.keys(DATA_KINDS) as (keyof typeof DATA_KINDS)[]) {
    if ((DATA_KINDS[group] as readonly string[]).includes(kind)) return group;
  }
  // Unreachable for a typed kind. An unknown kind is treated as private.
  return 'never';
}

export function decide(
  viewer: Viewer | null,
  learnerId: string,
  kind: DataKind,
  action: Action,
  link: LinkState | null,
): Decision {
  if (!viewer) return deny('not_signed_in');
  if (action === 'mark_misheard' && kind !== 'tries') return deny('wrong_kind_for_action');

  if (viewer.role === 'student') {
    return viewer.id === learnerId ? allow('own_data') : deny('not_own_data');
  }

  if (viewer.role !== 'parent') return deny('unknown_role');

  const group = groupOf(kind);
  if (group === 'never') return deny('never_shared');
  if (action === 'write') return deny('parents_cannot_write');
  if (!link) return deny('not_linked');
  if (link.status !== 'active') return deny('link_not_active');

  const shared = group === 'progress' ? link.sharesProgress : link.sharesAnalysis;
  return shared ? allow('shared_with_parent') : deny('not_shared');
}
