import { redirect } from 'next/navigation';
import { StudentEmpty } from '@/components/student/common';
import { PlacementIntro } from '@/components/student/PlacementScreens';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

/** Canvas G1. A learner part way through placement is sent to the screen for their step. */
export default async function Page() {
  const step = await student.placement(await requireLearner());
  if (!step.ok) return <StudentEmpty reason={step.reason} />;
  if (step.data.step === 'between') redirect('/placement/next');
  if (step.data.step === 'result') redirect('/placement/result');
  return <PlacementIntro step={step.data} />;
}
