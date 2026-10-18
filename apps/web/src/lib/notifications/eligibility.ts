/**
 * Who may receive an optional BB-76 email. Pure rules, no database access:
 * the caller loads the facts through the authorization layer (BB-10) and
 * calls these at send time, so a revoked link or a turned-off preference
 * stops the very next email.
 *
 * Default is no: every rule must pass before anything is sent.
 */

export type NotificationKind = 'parent_summary' | 'learner_reminder';

export type Ineligible =
  | 'not_opted_in'
  | 'no_verified_email'
  | 'learner_under_13'
  | 'no_active_link'
  | 'progress_not_shared';

export type Eligibility = { ok: true } | { ok: false; reason: Ineligible };

export interface Recipient {
  optedIn: boolean;
  email: string | null;
  emailVerified: boolean;
}

export interface LearnerFacts {
  /** Decided by the server-side age gate (BB-8). Never taken from the browser. */
  isUnder13: boolean;
}

export interface LinkFacts {
  status: 'pending' | 'active' | 'revoked';
  sharesProgress: boolean;
}

const no = (reason: Ineligible): Eligibility => ({ ok: false, reason });

function recipientCheck(r: Recipient): Eligibility | null {
  if (!r.optedIn) return no('not_opted_in');
  if (!r.email || !r.emailVerified) return no('no_verified_email');
  return null;
}

/** A learner reminder: opted in, own verified email, and 13 or older. */
export function canSendLearnerReminder(learner: Recipient & LearnerFacts): Eligibility {
  const failed = recipientCheck(learner);
  if (failed) return failed;
  if (learner.isUnder13) return no('learner_under_13');
  return { ok: true };
}

/**
 * A weekly parent summary: the parent opted in, the link is active and the
 * learner shares progress. A missing link counts as revoked.
 */
export function canSendParentSummary(parent: Recipient, link: LinkFacts | null): Eligibility {
  const failed = recipientCheck(parent);
  if (failed) return failed;
  if (!link || link.status !== 'active') return no('no_active_link');
  if (!link.sharesProgress) return no('progress_not_shared');
  return { ok: true };
}
