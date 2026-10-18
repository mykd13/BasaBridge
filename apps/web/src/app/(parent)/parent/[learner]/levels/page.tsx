import { LevelsScreen } from '@/components/parent/LevelsScreen';
import { loadLevels, toScreenState } from '@/server/parent/loaders';

export default async function Page({ params }: { params: Promise<{ learner: string }> }) {
  const { learner } = await params;
  return <LevelsScreen state={await toScreenState(() => loadLevels(learner))} />;
}
