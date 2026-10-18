import { redirect } from 'next/navigation';
import { StudentEmpty } from '@/components/student/common';
import { PlacementBetween } from '@/components/student/PlacementScreens';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

/** Canvas G2. */
export default async function Page() {
  const step = await student.placement(await requireLearner());
  if (!step.ok) return <StudentEmpty reason={step.reason} />;
  if (step.data.step === 'intro') redirect('/placement');
  if (step.data.step === 'result') redirect('/placement/result');
  return <PlacementBetween step={step.data} />;
}
