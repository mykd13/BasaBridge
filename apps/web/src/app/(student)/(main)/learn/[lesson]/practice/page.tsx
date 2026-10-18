import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Notice } from '@basabridge/ui';
import { LessonNotFound } from '@/features/learn/LessonNotFound';
import { PracticeRunner } from '@/features/learn/PracticeRunner';
import { practiceStepIndex, resumeAt } from '@/features/learn/steps';
import { currentLearnerId } from '@/server/learn/learner';
import { learnPort } from '@/server/learn/live';
import { NotWiredError } from '@/server/errors';
import type { PracticeItemView } from '@/server/learn/port';
import { lessonHref, safeReturnPath } from '@/server/learn/return-path';
import { checkPracticeAction, savePositionAction } from '../../actions';

export const dynamic = 'force-dynamic';

/** Lesson: guided practice (H4). */
export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ lesson: string }>;
  searchParams: Promise<{ return?: string | string[] }>;
}) {
  const [{ lesson: lessonId }, query] = await Promise.all([params, searchParams]);
  const returnTo = safeReturnPath(query.return);
  const port = learnPort();
  const found = await port.lesson(await currentLearnerId(), lessonId);
  if (!found) return <LessonNotFound />;

  const practiceStep = practiceStepIndex(found.lesson);
  if (practiceStep < 0) redirect(lessonHref(lessonId, returnTo, '/done'));

  const t = await getTranslations();
  let items: PracticeItemView[];
  try {
    items = await port.practiceItems(lessonId);
  } catch (error) {
    // Practice items come from BB-54. Until they do, say so instead of showing made-up questions.
    if (!(error instanceof NotWiredError)) throw error;
    return (
      <div className="bb-learn">
        <Notice tone="warn" title={t('learn.practice.notReady.title')}>
          <p>{t('learn.practice.notReady.body')}</p>
        </Notice>
      </div>
    );
  }
  if (items.length === 0) redirect(lessonHref(lessonId, returnTo, '/done'));

  const resume = resumeAt(found.lesson, found.position);
  return (
    <PracticeRunner
      lessonId={lessonId}
      items={items}
      initialItem={resume.screen === 'practice' ? resume.item : 0}
      practiceStep={practiceStep}
      returnTo={returnTo}
      check={checkPracticeAction}
      savePosition={savePositionAction}
    />
  );
}
