'use server';

import { redirect } from 'next/navigation';

/**
 * Ends the session. Stub until BB-7: there is no session to end yet.
 * BB-7 clears the session cookie here.
 */
export async function endSession(): Promise<void> {}

/** The no-script path: a plain form post ends the session and goes back to sign in. */
export async function signOut(): Promise<void> {
  await endSession();
  redirect('/sign-in');
}
