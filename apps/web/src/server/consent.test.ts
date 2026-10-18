import { describe, expect, it, vi } from 'vitest';
import { LEGAL_VERSIONS } from '@/legal/versions';
import {
  CONSENT_AUDIT_ACTION,
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

const userId = '00000000-0000-4000-8000-000000000001';

function fakeStore(initial: Partial<Record<ConsentKind, number>> = {}) {
  const rows = new Map<ConsentKind, StoredConsent>(
    Object.entries(initial).map(([kind, version]) => [
      kind as ConsentKind,
      { version: version!, givenAt: new Date(0) },
    ]),
  );
  const audit: { actorUserId: string; action: string; target: string }[] = [];
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

describe('consent interface before BB-11', () => {
  it('throws NotWiredError from recordConsent and latestConsent', async () => {
    await expect(recordConsent(userId, 'privacy', 1)).rejects.toBeInstanceOf(NotWiredError);
    await expect(latestConsent(userId, 'privacy')).rejects.toBeInstanceOf(NotWiredError);
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

  it('stays closed while BB-11 is not wired, except with the dev override', async () => {
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
