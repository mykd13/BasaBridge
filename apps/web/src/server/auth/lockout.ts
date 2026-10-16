import { and, eq, gt, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { signInFailures } from '@basabridge/db/schema';
import type * as Schema from '@basabridge/db/schema';
import { authConfig } from './config';

export type Db = PgDatabase<PgQueryResultHKT, typeof Schema>;

const windowStart = () => new Date(Date.now() - authConfig.lockoutWindowMinutes * 60_000);

export function normalizeIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function isLockedOut(db: Db, identifier: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(signInFailures)
    .where(
      and(
        eq(signInFailures.identifier, normalizeIdentifier(identifier)),
        gt(signInFailures.createdAt, windowStart()),
      ),
    );
  return (row?.n ?? 0) >= authConfig.lockoutMaxFailures;
}

export async function recordFailure(db: Db, identifier: string): Promise<void> {
  await db.insert(signInFailures).values({ identifier: normalizeIdentifier(identifier) });
}

export async function clearFailures(db: Db, identifier: string): Promise<void> {
  await db
    .delete(signInFailures)
    .where(eq(signInFailures.identifier, normalizeIdentifier(identifier)));
}
