/**
 * The consent interface the legal pages and the layouts code against (BB-69). Server only.
 *
 * BB-11 (consent records and audit log, Rhett) is not on main yet. Until it is, the default store
 * throws NotWiredError, so `recordConsent` and `latestConsent` both throw. When BB-11 lands, give
 * `defaultStore` the database calls and nothing else here changes. Consent text is a locked area
 * (Rhett and James): the versions come from `@/legal/versions`.
 *
 * Authorization (AGENTS.md rule 4): a consent belongs to the person who gave it. These functions
 * are called with the signed-in user's id and never with a learner picked from a request.
 */
import { redirect } from 'next/navigation';
import { LEGAL_VERSIONS } from '@/legal/versions';
import { NotWiredError } from './errors';
import { devRoleFromEnv, getSessionUser, type SessionUser } from './session';

export const CONSENT_KINDS = ['privacy', 'terms', 'mic', 'study'] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

/** The audit entry every consent writes. Ids only: who agreed, and the same id as the target. */
export const CONSENT_AUDIT_ACTION = 'consent_given';

export interface StoredConsent {
  version: number;
  givenAt: Date;
}

/** The database calls this module needs. Tests pass a fake. BB-11 supplies the real one. */
export interface ConsentStore {
  latest: (userId: string, kind: ConsentKind) => Promise<StoredConsent | null>;
  insert: (values: { userId: string; kind: ConsentKind; version: number }) => Promise<void>;
  audit: (values: { actorUserId: string; action: string; target: string }) => Promise<void>;
}

const notWired = (what: string) => async (): Promise<never> => {
  throw new NotWiredError(`${what} waits for BB-11 (consent records)`);
};

export const defaultStore: ConsentStore = {
  latest: notWired('latestConsent'),
  insert: notWired('recordConsent'),
  audit: notWired('recordConsent audit entry'),
};

function assertKind(kind: string): asserts kind is ConsentKind {
  if (!(CONSENT_KINDS as readonly string[]).includes(kind)) {
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
 * While BB-11 is not wired, the check cannot run. With the dev role override (never in
 * production) the page opens so the app can be built and tested. Anywhere else the NotWiredError
 * stands and the route shows "not ready yet", so the gate never silently lets anyone through.
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
