/**
 * Consent records and audit entries (BB-11). Server only.
 *
 * Consent text lives with the privacy notice (BB-69) and is a locked area (Rhett and James).
 * This file holds only the current version number of each consent. Bump a version when its text
 * changes; every learner who agreed to an older version is then asked again.
 */
import { createDbFromEnv, insertAudit, insertConsent, listConsents, type Db } from '@basabridge/db';

export const CONSENT_VERSIONS = {
  /** Recording the learner's voice to check their reading. */
  microphone: 1,
  /** Keeping reading results so the app can choose the next story. */
  stored_results: 1,
} as const;

export type ConsentKind = keyof typeof CONSENT_VERSIONS;

/** Every action that must leave an audit entry. Free text is not accepted. */
export const AUDIT_ACTIONS = [
  'guardian_approved',
  'guardian_declined',
  'guardian_expired',
  'link_created',
  'link_revoked',
  'data_exported',
  'account_deleted',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The database calls this module needs. Tests pass a fake. */
export interface ConsentStore {
  listConsents: (userId: string) => Promise<{ kind: string; version: number }[]>;
  insertConsent: (values: { userId: string; kind: string; version: number }) => Promise<unknown>;
  insertAudit: (values: {
    actorUserId: string | null;
    action: string;
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

/** Records that the user agreed to the current version of a consent. */
export async function recordConsent(
  userId: string,
  kind: ConsentKind,
  store: ConsentStore = dbStore(),
): Promise<void> {
  assertId(userId, 'userId');
  if (!(kind in CONSENT_VERSIONS)) throw new Error(`Unknown consent: ${String(kind)}`);
  await store.insertConsent({ userId, kind, version: CONSENT_VERSIONS[kind] });
}

/** The consents to ask for: never given, or given for an older version of the text. */
export async function consentsNeeded(
  userId: string,
  store: ConsentStore = dbStore(),
): Promise<ConsentKind[]> {
  assertId(userId, 'userId');
  const latest = new Map<string, number>();
  for (const row of await store.listConsents(userId)) {
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
