/**
 * Learn's only I/O, through an interface over the `lesson_progress` table. A Drizzle adapter lives
 * with the database client and reads learner data through the authorization layer (BB-10).
 *
 * The store can read and write lesson progress and nothing else. Learn has no way to change a
 * level: practice and check items inside a lesson are tagged `learn`, which mastery never counts
 * as level evidence (`countsAsLevelEvidence`).
 */
import { countsAsLevelEvidence, type EvidenceSource } from '@basabridge/mastery';
import {
  applyStoryToProgress,
  completeLesson,
  startLesson,
  type StoryRecheckEvidence,
} from './recheck';
import type { LessonRegistry } from './registry';
import type { LessonProgressRow } from './status';

export interface LessonProgressStore {
  /** Every lesson_progress row for the learner. */
  list(learnerId: string): Promise<LessonProgressRow[]>;
  /** Insert or update one row, keyed by learner and lesson. */
  save(learnerId: string, row: LessonProgressRow): Promise<void>;
}

/** One answer to a practice or check item inside a lesson. Feedback only, never level evidence. */
export interface LearnItemResult {
  source: Extract<EvidenceSource, 'learn'>;
  kind: 'practice' | 'check';
  correct: boolean;
}

/** Always false. Kept as a function so callers and tests go through mastery's rule. */
export function learnItemMovesLevel(item: LearnItemResult): boolean {
  return countsAsLevelEvidence(item.source);
}

export class UnknownLessonError extends Error {
  constructor(readonly lessonId: string) {
    super(`No reviewed lesson ${lessonId}`);
    this.name = 'UnknownLessonError';
  }
}

async function rowFor(
  store: LessonProgressStore,
  registry: LessonRegistry,
  learnerId: string,
  lessonId: string,
): Promise<LessonProgressRow | undefined> {
  if (!registry.get(lessonId)) throw new UnknownLessonError(lessonId);
  return (await store.list(learnerId)).find((r) => r.lessonId === lessonId);
}

/** The learner opened a lesson. Only reviewed lessons can be opened. */
export async function openLesson(
  store: LessonProgressStore,
  registry: LessonRegistry,
  learnerId: string,
  lessonId: string,
): Promise<LessonProgressRow> {
  const existing = await rowFor(store, registry, learnerId, lessonId);
  const row = startLesson(lessonId, existing);
  if (row !== existing) await store.save(learnerId, row);
  return row;
}

/** The learner reached the end of a lesson. Its skill is rechecked in the next story. */
export async function finishLesson(
  store: LessonProgressStore,
  registry: LessonRegistry,
  learnerId: string,
  lessonId: string,
  at: Date,
): Promise<LessonProgressRow> {
  const row = completeLesson(
    startLesson(lessonId, await rowFor(store, registry, learnerId, lessonId)),
    at,
  );
  await store.save(learnerId, row);
  return row;
}

/** After a real story is scored: count its answers toward waiting lessons. */
export async function recordStoryRechecks(
  store: LessonProgressStore,
  registry: LessonRegistry,
  learnerId: string,
  story: StoryRecheckEvidence,
): Promise<LessonProgressRow[]> {
  const changed = applyStoryToProgress(await store.list(learnerId), registry, story);
  for (const row of changed) await store.save(learnerId, row);
  return changed;
}

/** For tests and local work without a database. */
export function memoryLessonProgressStore(): LessonProgressStore & {
  rows: Map<string, LessonProgressRow[]>;
} {
  const rows = new Map<string, LessonProgressRow[]>();
  return {
    rows,
    async list(learnerId) {
      return [...(rows.get(learnerId) ?? [])];
    },
    async save(learnerId, row) {
      const kept = (rows.get(learnerId) ?? []).filter((r) => r.lessonId !== row.lessonId);
      rows.set(learnerId, [...kept, row]);
    },
  };
}
