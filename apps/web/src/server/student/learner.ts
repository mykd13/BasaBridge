import { redirect } from 'next/navigation';
import { getSessionUser } from '../session';

/** The signed-in learner's id, or a redirect to sign in. Pages pass this to the student seams. */
export async function requireLearner(): Promise<string> {
  const user = await getSessionUser();
  if (user?.role !== 'student') redirect('/sign-in');
  return user.id;
}
