import { Role } from '@basabridge/contracts';
import { connection } from 'next/server';
import { getCurrentUser } from '@/server/auth';

export interface SessionUser {
  id: string;
  role: Role;
}

/** Fixed ids for the dev override. Every user id column is a uuid, so these must be too. */
export const DEV_USER_IDS: Record<Role, string> = {
  student: '00000000-0000-4000-8000-000000000001',
  parent: '00000000-0000-4000-8000-000000000002',
};

/**
 * The role forced by BB_DEV_ROLE, or null. Honoured only outside production, so a stray
 * variable on a deployed server cannot sign anyone in.
 */
export function devRoleFromEnv(env: Record<string, string | undefined>): Role | null {
  if (env.NODE_ENV === 'production') return null;
  const parsed = Role.safeParse(env.BB_DEV_ROLE);
  return parsed.success ? parsed.data : null;
}

/**
 * The signed-in user, or null.
 * Reads the Better Auth session (BB-7). The dev override is the only other branch.
 * Without DATABASE_URL (a fresh checkout) nobody is signed in, so the app still renders.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // The answer depends on the request, so never prerender a page that asks for it.
  await connection();
  const devRole = devRoleFromEnv(process.env);
  if (devRole) return { id: DEV_USER_IDS[devRole], role: devRole };
  if (!process.env.DATABASE_URL) return null;
  const user = await getCurrentUser();
  return user ? { id: user.id, role: user.role } : null;
}
