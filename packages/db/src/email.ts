/**
 * Email suppression list (BB-64). Stores hashes, never readable addresses.
 */
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from './queries';
import { emailSuppressions } from './schema';

export type SuppressionReason = 'bounce' | 'complaint';

export function hashAddress(address: string): string {
  return createHash('sha256').update(address.trim().toLowerCase()).digest('hex');
}

/** Records a suppressed address. A second report for the same address keeps the first row. */
export async function suppressAddress(
  db: Db,
  address: string,
  reason: SuppressionReason,
  providerEmailId: string | null,
): Promise<void> {
  await db
    .insert(emailSuppressions)
    .values({ addressHash: hashAddress(address), reason, providerEmailId })
    .onConflictDoNothing();
}

export async function getSuppression(
  db: Db,
  address: string,
): Promise<{ reason: string } | undefined> {
  const [row] = await db
    .select({ reason: emailSuppressions.reason })
    .from(emailSuppressions)
    .where(eq(emailSuppressions.addressHash, hashAddress(address)));
  return row;
}
