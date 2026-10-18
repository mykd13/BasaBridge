import { redirect } from 'next/navigation';
import { loadProgress } from '@/server/progress/load-progress';
import { getSessionUser } from '@/server/session';
import { ProgressScreen } from './ProgressScreen';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  return <ProgressScreen view={await loadProgress(user)} />;
}
