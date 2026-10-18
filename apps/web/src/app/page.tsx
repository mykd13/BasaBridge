import { redirect } from 'next/navigation';

/** The front door is sign in. Signed-in learners go on from there once BB-7 lands. */
export default function Root() {
  redirect('/sign-in');
}
