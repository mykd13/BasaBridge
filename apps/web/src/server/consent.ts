/**
 * Consent records and audit entries (BB-69 interface, BB-11 storage). Server only.
 *
 * The legal pages and the layouts code against this interface. `defaultStore` writes to the
 * database (`consents` and the append-only `audit_log`). Consent text is a locked area (Rhett and
 * James): the versions come from `@/legal/versions`.
 *
 * Authorization (AGENTS.md rule 4): a consent belongs to the person who gave it. These functions
 * are called with the signed-in user's id and never with a learner picked from a request.
 */
import { redirect } from 'next/navigation';
import {
  AUDIT_ACTIONS,
  createDbFromEnv,
  insertAudit,
  insertConsent,
  listConsents,
  type AuditAction,
  type Db,
} from '@basabridge/db';
import { LEGAL_VERSIONS } from '@/legal/versions';
import { NotWiredError } from './errors';
import { devRoleFromEnv, getSessionUser, type SessionUser } from './session';

/** `stored_results` is the BB-11 consent to keep reading results. It has no document yet. */
export const CONSENT_KINDS = ['privacy', 'terms', 'mic', 'study', 'stored_results'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** The audit entry every consent writes. Ids only: who agreed, and the same id as the target. */
export const CONSENT_AUDIT_ACTION = 'consent_given' satisfies AuditAction;

export interface StoredConsent {
  version: number;
  givenAt: Date;
}

/** The database calls this module needs. Tests pass a fake. */
export interface ConsentStore {
  latest: (userId: string, kind: ConsentKind) => Promise<StoredConsent | null>;
  insert: (values: { userId: string; kind: ConsentKind; version: number }) => Promise<void>;
  audit: (values: {
    actorUserId: string | null;
    action: AuditAction;
    target: string;
  }) => Promise<void>;
}

let shared: Db | undefined;

/** The real store. Pass a database in tests; otherwise one is opened from the environment. */
export function dbStore(db?: Db): ConsentStore {
  const get = () => {
    if (db) return db;
    // Without a database the check cannot run. The layout gate lets only the dev role override
    // through (never in production); anywhere else this error stands.
    if (!process.env.DATABASE_URL) throw new NotWiredError('DATABASE_URL is not set');
    return (shared ??= createDbFromEnv().db as unknown as Db);
  };
  return {
    latest: async (userId, kind) => {
      let best: StoredConsent | null = null;
      for (const row of await listConsents(get(), userId)) {
        if (row.kind === kind && (!best || row.version >= best.version)) {
          best = { version: row.version, givenAt: row.givenAt };
        }
      }
      return best;
    },
    insert: async (values) => void (await insertConsent(get(), values)),
    audit: async (values) => void (await insertAudit(get(), values)),
  };
}

export const defaultStore: ConsentStore = dbStore();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertId(value: string, field: string): void {
  if (!UUID.test(value)) throw new Error(`${field} must be an id`);
}

/**
 * Writes an audit entry. Ids only: the actor (null for the system, such as an expiry) and the
 * id of what was acted on. Entries can never be changed afterwards (database trigger).
 */
export async function audit(
  actorUserId: string | null,
  action: AuditAction,
  targetId: string,
  store: ConsentStore = defaultStore,
): Promise<void> {
  if (actorUserId !== null) assertId(actorUserId, 'actorUserId');
  assertId(targetId, 'targetId');
  if (!(AUDIT_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`Unknown audit action: ${String(action)}`);
  }
  await store.audit({ actorUserId, action, target: targetId });
}

function assertKind(kind: string): asserts kind is ConsentKind {
  if (!Object.hasOwn(Object.fromEntries(CONSENT_KINDS.map((k) => [k, true])), kind)) {
    throw new Error(`Unknown consent kind: ${kind}`);
  }
}

/** Records that a user agreed to one version of one consent, and writes the audit entry. */
export async function recordConsent(
  userId: string,
  kind: ConsentKind,
  version: number,
  store: ConsentStore = defaultStore,
): Promise<void> {
  assertId(userId, 'userId');
  assertKind(kind);
  if (!Number.isInteger(version) || version < 1)
    throw new Error('A consent version is a whole number');
  await store.insert({ userId, kind, version });
  await store.audit({ actorUserId: userId, action: CONSENT_AUDIT_ACTION, target: userId });
}

/** The newest agreement a user gave for one kind, or null if they never gave one. */
export function latestConsent(
  userId: string,
  kind: ConsentKind,
  store: ConsentStore = defaultStore,
): Promise<StoredConsent | null> {
  assertId(userId, 'userId');
  assertKind(kind);
  return store.latest(userId, kind);
}

/** The consents every signed-in page needs, with the version the text is at now. */
export const REQUIRED_CONSENTS = [
  { kind: 'privacy', version: LEGAL_VERSIONS.privacy },
  { kind: 'terms', version: LEGAL_VERSIONS.terms },
] as const satisfies readonly { kind: ConsentKind; version: number }[];

export type LatestConsentFn = (userId: string, kind: ConsentKind) => Promise<StoredConsent | null>;

/** True when the user agreed to the current version of every required consent. */
export async function hasCurrentConsent(
  userId: string,
  latest: LatestConsentFn = latestConsent,
): Promise<boolean> {
  for (const { kind, version } of REQUIRED_CONSENTS) {
    const stored = await latest(userId, kind);
    if (!stored || stored.version < version) return false;
  }
  return true;
}

export const CONSENT_UPDATE_PATH = '/consent/update';

export interface ConsentGateDeps {
  getUser: () => Promise<SessionUser | null>;
  latest: LatestConsentFn;
  redirect: (path: string) => never;
  /** The dev role override is on. It exists only outside production. */
  devOverride: boolean;
}

/**
 * Used by the (student) and (parent) layouts. Sends the user to `/consent/update` when they
 * never agreed or agreed to an older version of the privacy notice or the terms.
 *
 * If the check cannot run because a part is not wired yet (NotWiredError), the dev role override
 * (never in production) lets the page open so the app can be built and tested. Anywhere else the
 * error stands and the route shows "not ready yet", so the gate never silently lets anyone through.
 */
export async function requireCurrentConsent(deps?: Partial<ConsentGateDeps>): Promise<void> {
  const gate: ConsentGateDeps = {
    getUser: getSessionUser,
    latest: latestConsent,
    redirect,
    devOverride: devRoleFromEnv(process.env) !== null,
    ...deps,
  };
  const user = await gate.getUser();
  if (!user) return gate.redirect('/sign-in');
  try {
    if (await hasCurrentConsent(user.id, gate.latest)) return;
  } catch (error) {
    if (error instanceof NotWiredError && gate.devOverride) return;
    throw error;
  }
  return gate.redirect(CONSENT_UPDATE_PATH);
}
