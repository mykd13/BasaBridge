/**
 * Raw reads and writes for feature flags (BB-65). The flag list, defaults and validation live in
 * apps/web/src/server/flags.ts. Nothing here decides what a value means.
 */
import { eq } from 'drizzle-orm';
import type { Db } from './queries';
import { featureFlagChanges, featureFlags } from './schema';

export type FlagRow = typeof featureFlags.$inferSelect;
export type FlagChange = typeof featureFlagChanges.$inferSelect;

export async function readFlagRows(db: Db): Promise<FlagRow[]> {
  return db.select().from(featureFlags);
}

/**
 * Sets one flag and logs the change in the same transaction, so a change is never made without
 * a log row. `actorUserId` is null when a team script makes the change.
 */
export async function writeFlag(
  db: Db,
  key: string,
  value: unknown,
  actorUserId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(featureFlags).where(eq(featureFlags.key, key));
    const now = new Date();
    await tx
      .insert(featureFlags)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: featureFlags.key, set: { value, updatedAt: now } });
    await tx.insert(featureFlagChanges).values({
      key,
      oldValue: current?.value ?? null,
      newValue: value,
      actorUserId,
      at: now,
    });
  });
}

export async function readFlagChanges(db: Db, key: string): Promise<FlagChange[]> {
  return db
    .select()
    .from(featureFlagChanges)
    .where(eq(featureFlagChanges.key, key))
    .orderBy(featureFlagChanges.at);
}
