import { drizzle } from 'drizzle-orm/node-postgres';
import { headers } from 'next/headers';
import * as schema from '@basabridge/db/schema';
import { createAuth, type Auth } from './create-auth';
import type { Db } from './lockout';

export { NO_EMAIL_NOTICE, authConfig } from './config';
export { signUpParent, signUpStudent } from './accounts';

let instance: { auth: Auth; db: Db } | undefined;

/** Built on first use so importing this file never needs env vars (builds, tests). */
export function getAuth() {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    const secret = process.env.AUTH_SECRET;
    if (!url || !secret) throw new Error('DATABASE_URL and AUTH_SECRET must be set.');
    const db = drizzle(url, { schema }) as unknown as Db;
    instance = { db, auth: createAuth({ db, secret, baseURL: process.env.BETTER_AUTH_URL }) };
  }
  return instance;
}

/**
 * The signed-in user, or null. This is the only place pages and routes read the session,
 * and what the authorization layer (BB-10) builds on.
 */
export async function getCurrentUser() {
  const session = await getAuth().auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as { id: string; role: 'student' | 'parent'; emailReal?: boolean };
  return { id: u.id, role: u.role, canResetPassword: Boolean(u.emailReal) };
}
