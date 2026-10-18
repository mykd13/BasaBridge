/**
 * Consent records and audit entries (BB-11). Server only.
 *
 * Consent text lives with the privacy notice (BB-69) and is a locked area (Rhett and James).
 * This file holds only the current version number of each consent. Bump a version when its text
 * changes; every learner who agreed to an older version is then asked again.
 *
 * Authorization (AGENTS.md rule 4): consents are never shared with a parent and are never read or
 * written for another person, so these functions act only on the subject they are given: the
 * signed-in user, or the user just created at sign-up. There is no way to pass someone else's id
 * from a page, because pages cannot import the database (BB-10). Withdrawal, and the guardian
 * check for under-13 learners, belong to BB-8.
 */
import {
  AUDIT_ACTIONS,
  createDbFromEnv,
  insertAudit,
  insertConsent,
  listConsents,
  type AuditAction,
  type Db,
} from '@basabridge/db';

export const CONSENT_VERSIONS = {
  /** Recording the learner's voice to check their reading. */
  microphone: 1,
  /** Keeping reading results so the app can choose the next story. */
  stored_results: 1,
} as const;

export type ConsentKind = keyof typeof CONSENT_VERSIONS;

export { AUDIT_ACTIONS, type AuditAction };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The database calls this module needs. Tests pass a fake. */
export interface ConsentStore {
  listConsents: (userId: string) => Promise<{ kind: string; version: number }[]>;
  insertConsent: (values: { userId: string; kind: string; version: number }) => Promise<unknown>;
  insertAudit: (values: {
    actorUserId: string | null;
    action: AuditAction;
    target: string | null;
  }) => Promise<unknown>;
}

let shared: Db | undefined;

export function dbStore(db?: Db): ConsentStore {
  const get = () => db ?? (shared ??= createDbFromEnv().db as unknown as Db);
  return {
    listConsents: (userId) => listConsents(get(), userId),
    insertConsent: (values) => insertConsent(get(), values),
    insertAudit: (values) => insertAudit(get(), values),
  };
}

function assertId(value: string, field: string): void {
  if (!UUID.test(value)) throw new Error(`${field} must be an id`);
}

/** The person consents belong to. Always the signed-in user, never a learner picked by id. */
export interface ConsentSubject {
  id: string;
}

/** Records that the subject agreed to the current version of a consent. */
export async function recordConsent(
  subject: ConsentSubject,
  kind: ConsentKind,
  store: ConsentStore = dbStore(),
): Promise<void> {
  assertId(subject.id, 'userId');
  if (!Object.hasOwn(CONSENT_VERSIONS, kind)) throw new Error(`Unknown consent: ${String(kind)}`);
  await store.insertConsent({ userId: subject.id, kind, version: CONSENT_VERSIONS[kind] });
}

/** The consents to ask for: never given, or given for an older version of the text. */
export async function consentsNeeded(
  subject: ConsentSubject,
  store: ConsentStore = dbStore(),
): Promise<ConsentKind[]> {
  assertId(subject.id, 'userId');
  const latest = new Map<string, number>();
  for (const row of await store.listConsents(subject.id)) {
    latest.set(row.kind, Math.max(row.version, latest.get(row.kind) ?? 0));
  }
  return (Object.keys(CONSENT_VERSIONS) as ConsentKind[]).filter(
    (kind) => (latest.get(kind) ?? 0) < CONSENT_VERSIONS[kind],
  );
}

/**
 * Writes an audit entry. Ids only: the actor (null for the system, such as an expiry) and the
 * id of what was acted on. Entries can never be changed afterwards (database trigger).
 */
export async function audit(
  actorUserId: string | null,
  action: AuditAction,
  targetId: string,
  store: ConsentStore = dbStore(),
): Promise<void> {
  if (actorUserId !== null) assertId(actorUserId, 'actorUserId');
  assertId(targetId, 'targetId');
  if (!(AUDIT_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`Unknown audit action: ${String(action)}`);
  }
  await store.insertAudit({ actorUserId, action, target: targetId });
}
