import { StudentEmpty } from '@/components/student/common';
import { LevelUpScreen } from '@/components/student/ResultScreens';
import { titleFor } from '@/components/student/title';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

export const generateMetadata = () => titleFor('levelUp.pageTitle');

export default async function Page() {
  const view = await student.levelUp(await requireLearner());
  return view.ok ? <LevelUpScreen view={view.data} /> : <StudentEmpty reason={view.reason} />;
}
