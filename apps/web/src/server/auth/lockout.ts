import { and, eq, gt, lt, or, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { signInFailures, users } from '@basabridge/db/schema';
import type * as Schema from '@basabridge/db/schema';
import { authConfig } from './config';

export type Db = PgDatabase<PgQueryResultHKT, typeof Schema>;

const windowStart = () => new Date(Date.now() - authConfig.lockoutWindowMinutes * 60_000);

export function normalizeIdentifier(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * One counter per account, whichever sign-in route is used. A known username or email maps to
 * the user id. Unknown names are counted under the text itself so guessing is still limited.
 */
export async function lockoutKey(db: Db, raw: string): Promise<string> {
  const id = normalizeIdentifier(raw);
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, id), sql`lower(${users.username}) = ${id}`))
    .limit(1);
  return user ? `user:${user.id}` : `name:${id}`;
}

/**
 * Records this attempt first, then counts. Recording before the password is checked means a
 * burst of parallel requests cannot all pass the check. A good sign-in clears the rows.
 * Returns true when the attempt is over the limit and must be refused. A refused attempt
 * removes its own row, so retrying while locked never extends the lock: the lock ends 15
 * minutes after the last attempt that was actually checked.
 */
export async function registerAttempt(db: Db, key: string): Promise<boolean> {
  await db.delete(signInFailures).where(lt(signInFailures.createdAt, windowStart()));
  const [mine] = await db
    .insert(signInFailures)
    .values({ identifier: key })
    .returning({ id: signInFailures.id });
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(signInFailures)
    .where(and(eq(signInFailures.identifier, key), gt(signInFailures.createdAt, windowStart())));
  const locked = (row?.n ?? 0) > authConfig.lockoutMaxFailures;
  if (locked && mine) await db.delete(signInFailures).where(eq(signInFailures.id, mine.id));
  return locked;
}

export async function clearAttempts(db: Db, key: string): Promise<void> {
  await db.delete(signInFailures).where(eq(signInFailures.identifier, key));
}
