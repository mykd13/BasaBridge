import { describe, expect, it } from 'vitest';
import { createUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe';

const secret = 'test-secret-that-is-long-enough-0123456789';
const claim = { userId: '6f1c2b8e-0000-4000-8000-000000000001', kind: 'parent_summary' as const };

describe('unsubscribe tokens', () => {
  it('round-trips a valid token', () => {
    const token = createUnsubscribeToken(claim, secret);
    expect(verifyUnsubscribeToken(token, secret)).toEqual(claim);
  });

  it('rejects a token signed with another secret', () => {
    const token = createUnsubscribeToken(claim, secret);
    expect(verifyUnsubscribeToken(token, `${secret}-other`)).toBeNull();
  });

  it('rejects a token whose payload was changed', () => {
    const [, mac] = createUnsubscribeToken(claim, secret).split('.');
    const forged = Buffer.from(`${claim.userId}:learner_reminder`).toString('base64url');
    expect(verifyUnsubscribeToken(`${forged}.${mac}`, secret)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    for (const bad of ['', 'abc', 'a.b.c', '.', 'abc.']) {
      expect(verifyUnsubscribeToken(bad, secret)).toBeNull();
    }
  });

  it('carries no email or name', () => {
    const token = createUnsubscribeToken(claim, secret);
    const payload = Buffer.from(token.split('.')[0]!, 'base64url').toString();
    expect(payload).toBe(`${claim.userId}:parent_summary`);
  });

  it('refuses a short secret', () => {
    expect(() => createUnsubscribeToken(claim, 'short')).toThrow();
  });
});
