import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LearnHomeView } from '@/features/learn/LearnHomeView';
import { currentLearnerId } from '@/server/learn/learner';
import { learnPort } from '@/server/learn/live';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('learn.title')} · ${t('app.name')}` };
}

export const dynamic = 'force-dynamic';

/** Learn home (H2). Starts empty and fills from real lessons and real progress. */
export default async function LearnPage() {
  const home = await learnPort().home(await currentLearnerId());
  return <LearnHomeView home={home} />;
}
