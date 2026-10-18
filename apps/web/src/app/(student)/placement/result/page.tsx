import { redirect } from 'next/navigation';
import { StudentEmpty } from '@/components/student/common';
import { PlacementResultScreen } from '@/components/student/PlacementScreens';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

/** Canvas G3. */
export default async function Page() {
  const step = await student.placement(await requireLearner());
  if (!step.ok) return <StudentEmpty reason={step.reason} />;
  if (step.data.step === 'intro') redirect('/placement');
  if (step.data.step === 'between') redirect('/placement/next');
  return <PlacementResultScreen step={step.data} />;
}
