import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NotificationKind } from './eligibility';

/**
 * One-click unsubscribe tokens for BB-76 emails. A token names only an
 * opaque user id and the email kind, signed with a server secret
 * (UNSUBSCRIBE_SECRET in .env.local). It carries no name, email or score.
 * Tokens do not expire: an old email must still unsubscribe.
 */

const KINDS: readonly NotificationKind[] = ['parent_summary', 'learner_reminder'];

export interface UnsubscribeClaim {
  userId: string;
  kind: NotificationKind;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

const MIN_SECRET = 32;

function requireSecret(secret: string): void {
  if (secret.length < MIN_SECRET)
    throw new Error('Unsubscribe secret must be at least 32 characters');
}

export function createUnsubscribeToken(claim: UnsubscribeClaim, secret: string): string {
  requireSecret(secret);
  if (!claim.userId || claim.userId.includes(':')) throw new Error('Invalid user id for a token');
  const payload = Buffer.from(`${claim.userId}:${claim.kind}`).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Returns the claim for a valid token, or null for anything tampered or malformed. A missing or
 * short secret also returns null, so a misconfigured route refuses the request instead of
 * throwing a stack trace at a visitor. Creating a token still throws, to fail loudly in the job.
 */
export function verifyUnsubscribeToken(token: string, secret: string): UnsubscribeClaim | null {
  if (secret.length < MIN_SECRET) return null;
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const [userId, kind, rest] = Buffer.from(payload, 'base64url').toString().split(':');
  if (!userId || rest !== undefined || !KINDS.includes(kind as NotificationKind)) return null;
  return { userId, kind: kind as NotificationKind };
}
