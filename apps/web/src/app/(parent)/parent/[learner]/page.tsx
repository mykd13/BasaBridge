import { ProgressScreen } from '@/components/parent/ProgressScreen';
import { loadProgress, toScreenState } from '@/server/parent/loaders';

export default async function Page({ params }: { params: Promise<{ learner: string }> }) {
  const { learner } = await params;
  return <ProgressScreen state={await toScreenState(() => loadProgress(learner))} />;
}
