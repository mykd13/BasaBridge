'use server';

import { redirect } from 'next/navigation';

/**
 * Stub until BB-7: there is no session to end yet, so it only goes back to sign in.
 * BB-7 clears the session cookie here before the redirect.
 */
export async function signOut(): Promise<void> {
  redirect('/sign-in');
}
