import { describe, expect, it } from 'vitest';
import { CONSENT_VERSIONS, audit, consentsNeeded, recordConsent, type ConsentStore } from './index';

const userId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';

function fakeStore() {
  const consents: { userId: string; kind: string; version: number }[] = [];
  const auditRows: { actorUserId: string | null; action: string; target: string | null }[] = [];
  const store: ConsentStore = {
    listConsents: async (id) => consents.filter((c) => c.userId === id),
    insertConsent: async (values) => void consents.push(values),
    insertAudit: async (values) => void auditRows.push(values),
  };
  return { store, consents, auditRows };
}

describe('consent', () => {
  it('asks for every consent before any is given', async () => {
    const { store } = fakeStore();
    expect(await consentsNeeded(userId, store)).toEqual(Object.keys(CONSENT_VERSIONS));
  });

  it('records the current version and stops asking', async () => {
    const { store, consents } = fakeStore();
    await recordConsent(userId, 'microphone', store);
    await recordConsent(userId, 'stored_results', store);
    expect(consents).toEqual([
      { userId, kind: 'microphone', version: CONSENT_VERSIONS.microphone },
      { userId, kind: 'stored_results', version: CONSENT_VERSIONS.stored_results },
    ]);
    expect(await consentsNeeded(userId, store)).toEqual([]);
  });

  it('asks again when the stored version is older than the current text', async () => {
    const { store, consents } = fakeStore();
    consents.push({ userId, kind: 'microphone', version: CONSENT_VERSIONS.microphone - 1 });
    consents.push({ userId, kind: 'stored_results', version: CONSENT_VERSIONS.stored_results });
    expect(await consentsNeeded(userId, store)).toEqual(['microphone']);
  });

  it('refuses an unknown consent or a user that is not an id', async () => {
    const { store } = fakeStore();
    await expect(recordConsent(userId, 'cookies' as never, store)).rejects.toThrow('Unknown');
    await expect(recordConsent('maria', 'microphone', store)).rejects.toThrow('must be an id');
  });
});

describe('audit', () => {
  it('writes ids and a known action only', async () => {
    const { store, auditRows } = fakeStore();
    await audit(userId, 'link_revoked', otherId, store);
    await audit(null, 'guardian_expired', userId, store);
    expect(auditRows).toEqual([
      { actorUserId: userId, action: 'link_revoked', target: otherId },
      { actorUserId: null, action: 'guardian_expired', target: userId },
    ]);
  });

  it('refuses free text, names and unknown actions', async () => {
    const { store, auditRows } = fakeStore();
    await expect(audit(userId, 'renamed to Maria' as never, otherId, store)).rejects.toThrow(
      'Unknown audit action',
    );
    await expect(audit(userId, 'link_created', 'Maria Santos', store)).rejects.toThrow(
      'must be an id',
    );
    await expect(audit('maria12', 'link_created', otherId, store)).rejects.toThrow('must be an id');
    expect(auditRows).toEqual([]);
  });
});
