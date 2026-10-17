/**
 * Email suppression list (BB-64). Stores keyed hashes, never readable addresses.
 *
 * The hash is HMAC-SHA256 with a server secret (EMAIL_HASH_SECRET). A plain SHA-256 of an email
 * can be tested offline against a list of guessed addresses; a keyed hash cannot without the
 * secret. Changing the secret makes every stored row unmatchable, so set it once per database.
 */
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from './queries';
import { emailSuppressions } from './schema';

export type SuppressionReason = 'bounce' | 'complaint';

export function hashAddress(address: string, secret: string): string {
  if (!secret) throw new Error('An email hash secret is required');
  return createHmac('sha256', secret).update(address.trim().toLowerCase()).digest('hex');
}

/** Records a suppressed address. A second report for the same address keeps the first row. */
export async function suppressAddress(
  db: Db,
  secret: string,
  address: string,
  reason: SuppressionReason,
  providerEmailId: string | null,
): Promise<void> {
  await db
    .insert(emailSuppressions)
    .values({ addressHash: hashAddress(address, secret), reason, providerEmailId })
    .onConflictDoNothing();
}

export async function getSuppression(
  db: Db,
  secret: string,
  address: string,
): Promise<{ reason: string } | undefined> {
  const [row] = await db
    .select({ reason: emailSuppressions.reason })
    .from(emailSuppressions)
    .where(eq(emailSuppressions.addressHash, hashAddress(address, secret)));
  return row;
}
