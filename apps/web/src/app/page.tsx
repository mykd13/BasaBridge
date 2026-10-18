import { redirect } from 'next/navigation';
import { HOME_FOR_ROLE } from '@/server/redirect';
import { getSessionUser } from '@/server/session';

/** The front door: sign in, or straight to the right home for someone already signed in. */
export default async function Root() {
  const user = await getSessionUser();
  redirect(user ? HOME_FOR_ROLE[user.role] : '/sign-in');
}
