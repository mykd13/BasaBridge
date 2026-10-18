import { Role } from '@basabridge/contracts';
import { connection } from 'next/server';

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
 * Stub until BB-7 (PR #8) lands. Then this wraps `getCurrentUser()` and the dev override
 * stays as the only other branch.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // The answer depends on the request, so never prerender a page that asks for it.
  await connection();
  const devRole = devRoleFromEnv(process.env);
  if (devRole) return { id: DEV_USER_IDS[devRole], role: devRole };
  return null;
}
