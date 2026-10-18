import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as db from '@basabridge/db';
import { LEGAL_VERSIONS } from '@/legal/versions';
import {
  audit,
  CONSENT_AUDIT_ACTION,
  dbStore,
  CONSENT_UPDATE_PATH,
  hasCurrentConsent,
  latestConsent,
  recordConsent,
  requireCurrentConsent,
  type ConsentKind,
  type ConsentStore,
  type StoredConsent,
} from './consent';
import { NotWiredError } from './errors';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@basabridge/db', async (importOriginal) => ({
  ...(await importOriginal<typeof db>()),
  createDbFromEnv: vi.fn(),
  listConsents: vi.fn(),
  insertConsent: vi.fn(),
  insertAudit: vi.fn(),
}));

const userId = '00000000-0000-4000-8000-000000000001';

function fakeStore(initial: Partial<Record<ConsentKind, number>> = {}) {
  const rows = new Map<ConsentKind, StoredConsent>(
    Object.entries(initial).map(([kind, version]) => [
      kind as ConsentKind,
      { version: version!, givenAt: new Date(0) },
    ]),
  );
  const audit: { actorUserId: string | null; action: string; target: string }[] = [];
  const store: ConsentStore = {
    latest: async (_id, kind) => rows.get(kind) ?? null,
    insert: async ({ kind, version }) => void rows.set(kind, { version, givenAt: new Date() }),
    audit: async (values) => void audit.push(values),
  };
  return { store, audit };
}

class Redirected extends Error {
  constructor(public path: string) {
    super(`redirect ${path}`);
  }
}
const redirectTo = (path: string): never => {
  throw new Redirected(path);
};
const student = { id: userId, role: 'student' as const };

const both = (privacy: number, terms: number) => async (_id: string, kind: ConsentKind) =>
  kind === 'privacy'
    ? { version: privacy, givenAt: new Date(0) }
    : kind === 'terms'
      ? { version: terms, givenAt: new Date(0) }
      : null;

describe('the database store', () => {
  const fakeDb = {} as db.Db;
  beforeEach(() => vi.clearAllMocks());

  it('returns the highest version given for the kind', async () => {
    vi.mocked(db.listConsents).mockResolvedValue([
      { id: 'a', userId, kind: 'privacy', version: 1, givenAt: new Date(1) },
      { id: 'b', userId, kind: 'terms', version: 5, givenAt: new Date(2) },
      { id: 'c', userId, kind: 'privacy', version: 2, givenAt: new Date(3) },
    ] as never);
    expect((await latestConsent(userId, 'privacy', dbStore(fakeDb)))?.version).toBe(2);
    expect(await latestConsent(userId, 'mic', dbStore(fakeDb))).toBeNull();
  });

  it('writes the consent and then an id only audit entry', async () => {
    await recordConsent(userId, 'mic', 1, dbStore(fakeDb));
    expect(db.insertConsent).toHaveBeenCalledWith(fakeDb, { userId, kind: 'mic', version: 1 });
    expect(db.insertAudit).toHaveBeenCalledWith(fakeDb, {
      actorUserId: userId,
      action: 'consent_given',
      target: userId,
    });
  });

  it('refuses unknown kinds, prototype keys and a user that is not an id', async () => {
    const store = dbStore(fakeDb);
    for (const kind of ['cookies', 'constructor', 'toString', '__proto__']) {
      await expect(recordConsent(userId, kind as never, 1, store)).rejects.toThrow('Unknown');
    }
    await expect(recordConsent('maria', 'mic', 1, store)).rejects.toThrow('must be an id');
    expect(db.insertConsent).not.toHaveBeenCalled();
  });
});

describe('audit', () => {
  const other = '22222222-2222-4222-8222-222222222222';

  it('writes ids and a known action only', async () => {
    const { store, audit: rows } = fakeStore();
    await audit(userId, 'link_revoked', other, store);
    await audit(null, 'guardian_expired', userId, store);
    expect(rows).toEqual([
      { actorUserId: userId, action: 'link_revoked', target: other },
      { actorUserId: null, action: 'guardian_expired', target: userId },
    ]);
  });

  it('refuses free text, names and unknown actions', async () => {
    const { store, audit: rows } = fakeStore();
    await expect(audit(userId, 'renamed to Maria' as never, other, store)).rejects.toThrow(
      'Unknown audit action',
    );
    await expect(audit(userId, 'link_created', 'Maria Santos', store)).rejects.toThrow(
      'must be an id',
    );
    await expect(audit('maria12', 'link_created', other, store)).rejects.toThrow('must be an id');
    expect(rows).toEqual([]);
  });
});

describe('recordConsent', () => {
  it('stores the version and writes an audit entry with ids only', async () => {
    const { store, audit } = fakeStore();
    await recordConsent(userId, 'privacy', LEGAL_VERSIONS.privacy, store);
    expect((await latestConsent(userId, 'privacy', store))?.version).toBe(LEGAL_VERSIONS.privacy);
    expect(audit).toEqual([{ actorUserId: userId, action: CONSENT_AUDIT_ACTION, target: userId }]);
  });

  it('writes one audit entry for each consent', async () => {
    const { store, audit } = fakeStore();
    for (const kind of ['privacy', 'terms', 'mic', 'study'] as const) {
      await recordConsent(userId, kind, 1, store);
    }
    expect(audit).toHaveLength(4);
  });

  it('refuses an unknown kind and a version that is not a whole number', async () => {
    const { store, audit } = fakeStore();
    await expect(recordConsent(userId, 'ads' as ConsentKind, 1, store)).rejects.toThrow(
      /Unknown consent/,
    );
    await expect(recordConsent(userId, 'terms', 0, store)).rejects.toThrow(/whole number/);
    await expect(recordConsent(userId, 'terms', 1.5, store)).rejects.toThrow(/whole number/);
    expect(audit).toEqual([]);
  });

  it('writes no audit entry when the consent could not be stored', async () => {
    const { store, audit } = fakeStore();
    store.insert = async () => {
      throw new Error('db down');
    };
    await expect(recordConsent(userId, 'terms', 1, store)).rejects.toThrow('db down');
    expect(audit).toEqual([]);
  });
});

describe('hasCurrentConsent', () => {
  it('is true when privacy and terms are at the current version', async () => {
    const { store } = fakeStore({ privacy: LEGAL_VERSIONS.privacy, terms: LEGAL_VERSIONS.terms });
    expect(await hasCurrentConsent(userId, (id, kind) => latestConsent(id, kind, store))).toBe(
      true,
    );
  });

  it('is true for a newer stored version than the text', async () => {
    expect(
      await hasCurrentConsent(userId, both(LEGAL_VERSIONS.privacy + 1, LEGAL_VERSIONS.terms + 1)),
    ).toBe(true);
  });

  it('is false when either version is old, or nothing was ever agreed', async () => {
    expect(
      await hasCurrentConsent(userId, both(LEGAL_VERSIONS.privacy - 1, LEGAL_VERSIONS.terms)),
    ).toBe(false);
    expect(
      await hasCurrentConsent(userId, both(LEGAL_VERSIONS.privacy, LEGAL_VERSIONS.terms - 1)),
    ).toBe(false);
    expect(await hasCurrentConsent(userId, async () => null)).toBe(false);
  });

  it('does not require the mic or study consents for every page', async () => {
    const asked: ConsentKind[] = [];
    await hasCurrentConsent(userId, async (_id, kind) => {
      asked.push(kind);
      return { version: 99, givenAt: new Date(0) };
    });
    expect(asked).toEqual(['privacy', 'terms']);
  });
});

describe('requireCurrentConsent (the layout gate)', () => {
  const gate = (latest: Parameters<typeof hasCurrentConsent>[1], more = {}) =>
    requireCurrentConsent({
      getUser: async () => student,
      latest,
      redirect: redirectTo,
      devOverride: false,
      ...more,
    });

  it('redirects to /consent/update when the stored version is old', async () => {
    await expect(
      gate(both(LEGAL_VERSIONS.privacy - 1, LEGAL_VERSIONS.terms)),
    ).rejects.toMatchObject({
      path: CONSENT_UPDATE_PATH,
    });
  });

  it('redirects when the user never agreed', async () => {
    await expect(gate(async () => null)).rejects.toMatchObject({ path: '/consent/update' });
  });

  it('lets the page render when both versions are current', async () => {
    await expect(gate(both(LEGAL_VERSIONS.privacy, LEGAL_VERSIONS.terms))).resolves.toBeUndefined();
  });

  it('sends a signed-out visitor to sign in', async () => {
    await expect(gate(async () => null, { getUser: async () => null })).rejects.toMatchObject({
      path: '/sign-in',
    });
  });

  it('stays closed while a part is not wired, except with the dev override', async () => {
    const notWired = async () => {
      throw new NotWiredError('latestConsent');
    };
    await expect(gate(notWired)).rejects.toBeInstanceOf(NotWiredError);
    await expect(gate(notWired, { devOverride: true })).resolves.toBeUndefined();
  });

  it('does not hide other errors behind the dev override', async () => {
    const broken = async () => {
      throw new Error('db down');
    };
    await expect(gate(broken, { devOverride: true })).rejects.toThrow('db down');
  });
});
