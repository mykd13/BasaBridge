import { ReadingsScreen } from '@/components/parent/ReadingsScreen';
import { loadReadings, toScreenState } from '@/server/parent/loaders';

export default async function Page({ params }: { params: Promise<{ learner: string }> }) {
  const { learner } = await params;
  return <ReadingsScreen state={await toScreenState(() => loadReadings(learner))} />;
}
