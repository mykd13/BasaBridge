import { redirect } from 'next/navigation';
import { devRoleFromEnv, getSessionUser } from '@/server/session';

export const HOME_FOR_ROLE = { student: '/home', parent: '/parent' } as const;

/** Signed in people skip the sign in and create account pages and go to their own home. */
export async function redirectIfSignedIn(): Promise<void> {
  // BB_DEV_ROLE is a dev and test override. It must not hide the sign in page.
  if (devRoleFromEnv(process.env)) return;
  const user = await getSessionUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);
}
