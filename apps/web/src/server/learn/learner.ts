import { NotWiredError } from './not-wired';

/**
 * Who is signed in. Sign-in (BB-12) and the authorization layer (BB-10) do not exist yet. Outside
 * production a developer can name a learner with BB_DEV_LEARNER_ID to try the screens by hand.
 */
export async function currentLearnerId(): Promise<string> {
  const dev = process.env.NODE_ENV === 'production' ? undefined : process.env.BB_DEV_LEARNER_ID;
  if (dev) return dev;
  throw new NotWiredError('Sign-in (BB-12)');
}
