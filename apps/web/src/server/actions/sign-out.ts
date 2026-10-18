'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAuth } from '@/server/auth';

/** Ends the session: Better Auth revokes it and clears the cookie. A missing session is fine. */
export async function endSession(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch {
    // Already signed out, or auth is not configured here. Either way there is nothing to end.
  }
}

/** The no-script path: a plain form post ends the session and goes back to sign in. */
export async function signOut(): Promise<void> {
  await endSession();
  redirect('/sign-in');
}
