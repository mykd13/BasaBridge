import { drizzle } from 'drizzle-orm/node-postgres';
import { headers } from 'next/headers';
import * as schema from '@basabridge/db/schema';
import {
  signUpParent as signUpParentWith,
  signUpStudent as signUpStudentWith,
  type ParentSignUp,
  type StudentSignUp,
} from './accounts';
import { authConfig } from './config';
import { createAuth, type Auth } from './create-auth';
import type { Db } from './lockout';

export { AUTH_CODES } from './config';

let instance: { auth: Auth; db: Db } | undefined;

/** Built on first use so importing this file never needs env vars (builds, tests). */
function build() {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    const secret = process.env.AUTH_SECRET;
    const baseURL = process.env.BETTER_AUTH_URL;
    if (!url || !secret || !baseURL) {
      throw new Error('DATABASE_URL, AUTH_SECRET and BETTER_AUTH_URL must be set.');
    }
    if (secret.length < authConfig.minSecretLength) {
      throw new Error(`AUTH_SECRET must be at least ${authConfig.minSecretLength} characters.`);
    }
    const db = drizzle(url, { schema }) as unknown as Db;
    instance = { db, auth: createAuth({ db, secret, baseURL }) };
  }
  return instance;
}

/** Only the auth object leaves this module. The database handle stays inside (AGENTS rule 4). */
export const getAuth = (): Auth => build().auth;

export const signUpParent = (input: ParentSignUp) =>
  signUpParentWith(build().auth, build().db, input);
export const signUpStudent = (input: StudentSignUp) =>
  signUpStudentWith(build().auth, build().db, input);

/**
 * The signed-in user, or null. This is the only place pages and routes read the session,
 * and what the authorization layer (BB-10) builds on.
 *
 * Calling `auth.api.*` directly from server code skips the per address rate limiter. Sign-up has
 * no rate limit until BB-63.
 */
export async function getCurrentUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as { id: string; role: 'student' | 'parent'; emailReal?: boolean };
  return { id: u.id, role: u.role, canResetPassword: Boolean(u.emailReal) };
}
