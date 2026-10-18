import { SUBSKILL_PARENT, type SubSkill } from '@basabridge/contracts';
import type { LessonSubject } from '@basabridge/learn';
import type { LessonStatus } from '../../server/learn/port';

export type GroupKey = 'vocabulary' | 'literal' | 'inferential' | 'decoding' | 'wordPractice';

/** The group heading a lesson sits under on the Learn home. */
export function groupKeyFor(subject: LessonSubject): GroupKey {
  if (subject === 'decoding') return 'decoding';
  if (subject === 'word_practice') return 'wordPractice';
  return SUBSKILL_PARENT[subject as SubSkill];
}

export type StatusKey = 'new' | 'waitingForStory' | 'learned';

export function statusKeyFor(status: LessonStatus): StatusKey {
  return status === 'waiting_for_story' ? 'waitingForStory' : status;
}

export const STATUS_TONE: Record<StatusKey, 'accent' | 'warn' | 'good'> = {
  new: 'accent',
  waitingForStory: 'warn',
  learned: 'good',
};
