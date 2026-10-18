/**
 * Where a learner is with each lesson, and the data behind the Learn home (BB-56 renders it).
 * A lesson's status comes only from its `lesson_progress` row, so it is the same everywhere.
 */
import { LEARN_RULES, isLearned, recommend, type Gap } from './core';
import type { Lesson } from './lesson';
import type { LessonRegistry } from './registry';

/** One `lesson_progress` row. A row exists once the learner has opened the lesson. */
export interface LessonProgressRow {
  lessonId: string;
  completedAt: Date | null;
  recheckCorrect: number;
  recheckTotal: number;
}

export type LessonProgressStatus =
  /** Never opened. */
  | 'new'
  /** Opened and not finished, or finished but the recheck did not go well, so worth another go. */
  | 'in_progress'
  /** Finished. Fresh questions on this skill come in the next story. */
  | 'waiting_for_story'
  /** Finished and the fresh questions in a real story went well. */
  | 'learned';

export function toProgress(row: LessonProgressRow) {
  return {
    completed: row.completedAt !== null,
    recheckCorrect: row.recheckCorrect,
    recheckTotal: row.recheckTotal,
  };
}

/** Recheck questions still to come before the lesson can be judged. */
export function rechecksRemaining(row: LessonProgressRow): number {
  if (row.completedAt === null) return 0;
  return Math.max(0, LEARN_RULES.recheckItemsInNextStory - row.recheckTotal);
}

export function lessonStatus(row: LessonProgressRow | undefined): LessonProgressStatus {
  if (!row) return 'new';
  if (isLearned(toProgress(row))) return 'learned';
  if (rechecksRemaining(row) > 0) return 'waiting_for_story';
  return 'in_progress';
}

export interface LessonCard {
  lesson: Lesson;
  status: LessonProgressStatus;
}

export interface LearnHome {
  /** Lessons for the learner's gaps, most needed first. Never a learned or waiting lesson. */
  recommended: LessonCard[];
  /** Every lesson a learner may see, with its status. */
  all: LessonCard[];
}

export interface LearnHomeInput {
  gaps: Gap[];
  /** The learner's current level, from learners.level. */
  level: number;
  registry: LessonRegistry;
  progress: readonly LessonProgressRow[];
  limit?: number;
}

export function learnHome(i: LearnHomeInput): LearnHome {
  const rows = new Map(i.progress.map((r) => [r.lessonId, r]));
  const card = (lesson: Lesson): LessonCard => ({
    lesson,
    status: lessonStatus(rows.get(lesson.id)),
  });
  const all = i.registry.lessons.map(card);
  const open = all.filter((c) => c.status === 'new' || c.status === 'in_progress');
  const recommended = recommend(
    i.gaps,
    i.level,
    open.map((c) => c.lesson),
    i.limit,
  ).map(card);
  return { recommended, all };
}
