import { NotWiredError } from '@/server/errors';
import { getSessionUser } from '@/server/session';

/**
 * The signed-in learner. Until sign in lands (BB-7) the session is the dev stub, so a learner
 * only exists when BB_DEV_ROLE=student is set outside production. Parents never act as a learner.
 */
export async function currentLearnerId(): Promise<string> {
  const user = await getSessionUser();
  if (!user || user.role !== 'student') throw new NotWiredError('Sign-in as a learner (BB-7)');
  return user.id;
}
