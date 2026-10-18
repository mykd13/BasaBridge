'use server';

import { currentLearnerId } from '@/server/learn/learner';
import { learnPort } from '@/server/learn/live';
import type { LessonPosition, PracticeCheck } from '@/server/learn/port';

/** Saves the step the learner is on. The server checks the lesson and the step. */
export async function savePositionAction(
  lessonId: string,
  position: LessonPosition,
): Promise<void> {
  if (typeof lessonId !== 'string') return;
  await learnPort().savePosition(await currentLearnerId(), lessonId, {
    step: Number(position?.step),
    item: Number(position?.item),
  });
}

/** Checks one practice choice on the server. Practice never changes a level. */
export async function checkPracticeAction(itemId: string, index: number): Promise<PracticeCheck> {
  await currentLearnerId();
  return learnPort().checkPractice({ itemId: String(itemId), index: Number(index) });
}

/** The learner reached the end of a lesson. Queues the recheck questions for the next story. */
export async function completeLessonAction(lessonId: string): Promise<{ recheckItems: number }> {
  return learnPort().complete(await currentLearnerId(), String(lessonId));
}
