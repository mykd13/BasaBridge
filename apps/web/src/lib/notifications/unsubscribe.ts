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

function requireSecret(secret: string): void {
  if (secret.length < 32) throw new Error('Unsubscribe secret must be at least 32 characters');
}

export function createUnsubscribeToken(claim: UnsubscribeClaim, secret: string): string {
  requireSecret(secret);
  const payload = Buffer.from(`${claim.userId}:${claim.kind}`).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the claim for a valid token, or null for anything tampered or malformed. */
export function verifyUnsubscribeToken(token: string, secret: string): UnsubscribeClaim | null {
  requireSecret(secret);
  const [payload, mac, extra] = token.split('.');
  if (!payload || !mac || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  const [userId, kind, rest] = Buffer.from(payload, 'base64url').toString().split(':');
  if (!userId || rest !== undefined || !KINDS.includes(kind as NotificationKind)) return null;
  return { userId, kind: kind as NotificationKind };
}
