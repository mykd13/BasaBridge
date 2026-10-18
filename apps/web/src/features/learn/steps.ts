import type { Lesson, LessonStep } from '@basabridge/learn';
import type { LessonPosition } from '../../server/learn/port';

export type TeachStep = Extract<LessonStep, { kind: 'explain' | 'example' }> & {
  /** Index in `lesson.steps`, which is what the saved position counts. */
  index: number;
};

/** The explain and example steps shown on H3. Practice and check steps are not part of it. */
export function teachSteps(lesson: Lesson): TeachStep[] {
  return lesson.steps.flatMap((step, index) =>
    step.kind === 'explain' || step.kind === 'example' ? [{ ...step, index }] : [],
  );
}

export function practiceStepIndex(lesson: Lesson): number {
  return lesson.steps.findIndex((s) => s.kind === 'practice');
}

export type Resume = { screen: 'teach'; teachIndex: number } | { screen: 'practice'; item: number };

/**
 * Where a saved position puts the learner. A position on or after the practice step opens
 * practice, a position on a teaching step opens that step, and anything else starts over.
 */
export function resumeAt(lesson: Lesson, position: LessonPosition): Resume {
  const teach = teachSteps(lesson);
  const practice = practiceStepIndex(lesson);
  if (practice >= 0 && position.step >= practice)
    return { screen: 'practice', item: position.item };
  const found = teach.findIndex((s) => s.index >= position.step);
  return { screen: 'teach', teachIndex: Math.max(0, found) };
}
