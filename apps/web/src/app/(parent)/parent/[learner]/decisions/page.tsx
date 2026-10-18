import { DecisionsScreen } from '@/components/parent/DecisionsScreen';
import { loadDecisions, toScreenState } from '@/server/parent/loaders';

export default async function Page({ params }: { params: Promise<{ learner: string }> }) {
  const { learner } = await params;
  return <DecisionsScreen state={await toScreenState(() => loadDecisions(learner))} />;
}
