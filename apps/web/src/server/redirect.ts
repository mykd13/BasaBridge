import { redirect } from 'next/navigation';
import { getSessionUser } from '@/server/session';

export const HOME_FOR_ROLE = { student: '/home', parent: '/parent' } as const;

/** Signed in people skip the sign in and create account pages and go to their own home. */
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getSessionUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);
}
