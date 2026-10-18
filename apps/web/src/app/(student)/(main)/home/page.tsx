import { StudentEmpty } from '@/components/student/common';
import { HomeScreen } from '@/components/student/HomeScreen';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

export default async function Page() {
  const home = await student.home(await requireLearner());
  return home.ok ? <HomeScreen home={home.data} /> : <StudentEmpty reason={home.reason} />;
}
