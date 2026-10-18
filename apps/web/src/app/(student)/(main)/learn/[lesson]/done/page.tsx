import { LEARN_RULES } from '@basabridge/learn';
import { CompleteOnMount } from '@/features/learn/CompleteOnMount';
import { LessonDoneView } from '@/features/learn/LessonDoneView';
import { LessonNotFound } from '@/features/learn/LessonNotFound';
import { currentLearnerId } from '@/server/learn/learner';
import { learnPort } from '@/server/learn/live';
import { safeReturnPath } from '@/server/learn/return-path';
import { completeLessonAction } from '../../actions';

export const dynamic = 'force-dynamic';

/** Lesson done (H5). Finishing queues fresh questions for the next story. It never moves a level. */
export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ lesson: string }>;
  searchParams: Promise<{ return?: string | string[] }>;
}) {
  const [{ lesson: lessonId }, query] = await Promise.all([params, searchParams]);
  const found = await learnPort().lesson(await currentLearnerId(), lessonId);
  if (!found) return <LessonNotFound />;
  return (
    <>
      <CompleteOnMount lessonId={lessonId} complete={completeLessonAction} />
      <LessonDoneView
        title={found.lesson.title}
        recheckItems={LEARN_RULES.recheckItemsInNextStory}
        returnTo={safeReturnPath(query.return)}
      />
    </>
  );
}
