import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { LessonNotFound } from '../../../../features/learn/LessonNotFound';
import { LessonWalkthrough } from '../../../../features/learn/LessonWalkthrough';
import { groupKeyFor } from '../../../../features/learn/skill';
import { practiceStepIndex, resumeAt, teachSteps } from '../../../../features/learn/steps';
import { currentLearnerId } from '../../../../server/learn/learner';
import { learnPort } from '../../../../server/learn/live';
import { lessonHref, safeReturnPath } from '../../../../server/learn/return-path';
import { savePositionAction } from '../actions';

export const dynamic = 'force-dynamic';

/** Lesson: explain and example (H3). Opens where the learner stopped. */
export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lesson: string }>;
  searchParams: Promise<{ return?: string | string[] }>;
}) {
  const [{ lesson: lessonId }, query] = await Promise.all([params, searchParams]);
  const returnTo = safeReturnPath(query.return);
  const found = await learnPort().lesson(await currentLearnerId(), lessonId);
  if (!found) return <LessonNotFound />;

  const resume = resumeAt(found.lesson, found.position);
  if (resume.screen === 'practice') redirect(lessonHref(lessonId, returnTo, '/practice'));

  const steps = teachSteps(found.lesson);
  if (steps.length === 0) redirect(lessonHref(lessonId, returnTo, '/practice'));
  const practice = practiceStepIndex(found.lesson);
  const t = await getTranslations();
  return (
    <LessonWalkthrough
      lessonId={found.lesson.id}
      title={found.lesson.title}
      goal={found.lesson.goal}
      group={t(`learn.group.${groupKeyFor(found.lesson.subject)}`)}
      steps={steps}
      initialIndex={resume.teachIndex}
      practiceStep={practice >= 0 ? practice : null}
      returnTo={returnTo}
      savePosition={savePositionAction}
    />
  );
}
