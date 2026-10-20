/**
 * Finishing a lesson, and checking it in the next real story (docs/PLAN.md section 6.3).
 *
 * A finished lesson asks for `LEARN_RULES.recheckItemsInNextStory` fresh questions on its skill in
 * the learner's next story. Answers to those questions, and nothing inside Learn, decide whether
 * the lesson is learned. Decoding and word practice lessons have no question skill, so each later
 * counted try is one recheck item: right when its words-right meets the pass rule.
 */
import { SubSkill } from '@basabridge/contracts';
import { PASS_RULE } from '@basabridge/levels';
import { isLearned } from './core';
import type { LessonRegistry } from './registry';
import { rechecksRemaining, toProgress, type LessonProgressRow } from './status';

/** The row for a lesson the learner has just opened. Opening again keeps what is there. */
export function startLesson(lessonId: string, row?: LessonProgressRow): LessonProgressRow {
  return (
    row ?? {
      lessonId,
      completedAt: null,
      recheckCorrect: 0,
      recheckTotal: 0,
      lastRecheckStoryId: null,
    }
  );
}

/**
 * The learner reached the end of the lesson. Earlier recheck results are cleared, so a lesson
 * redone after a recheck that did not go well is checked again. A learned lesson stays learned.
 * The last counted story is kept, so that story cannot count again toward the redone lesson.
 */
export function completeLesson(row: LessonProgressRow, at: Date): LessonProgressRow {
  if (isLearned(toProgress(row))) return row;
  return { ...row, completedAt: at, recheckCorrect: 0, recheckTotal: 0 };
}

export interface RecheckRequest {
  lessonId: string;
  subskill: SubSkill;
  /** Fresh questions on this sub-skill to put in the next story. */
  items: number;
}

/**
 * Questions the next story should include, oldest finished lesson first. The story builder adds
 * what fits; anything left is asked for again after that story.
 */
export function rechecksForNextStory(
  rows: readonly LessonProgressRow[],
  registry: LessonRegistry,
): RecheckRequest[] {
  return rows
    .filter((r) => r.completedAt !== null && rechecksRemaining(r) > 0)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
    .flatMap((r) => {
      const subskill = SubSkill.safeParse(registry.get(r.lessonId)?.subject);
      return subskill.success
        ? [{ lessonId: r.lessonId, subskill: subskill.data, items: rechecksRemaining(r) }]
        : [];
    });
}

/** What a finished real story contributes to rechecks. Never a Learn practice or check item. */
export interface StoryRecheckEvidence {
  /** The story these answers came from. One story counts toward a lesson at most once. */
  storyId: string;
  /** When the story's questions were finished. Only lessons finished before this are checked. */
  finishedAt: Date;
  /** Answers in the order given, with each question's sub-skill. */
  answers: { subskill: string | null; correct: boolean }[];
  /** The counted try, when the learner read aloud. */
  countedTry?: { wordsRight: number; wordsTotal: number };
}

/** The rows a finished story changes. Rows it does not touch are left out. */
export function applyStoryToProgress(
  rows: readonly LessonProgressRow[],
  registry: LessonRegistry,
  story: StoryRecheckEvidence,
): LessonProgressRow[] {
  const used = new Set<number>();
  const changed: LessonProgressRow[] = [];
  const waiting = rows
    .filter((r) => r.completedAt !== null && r.completedAt < story.finishedAt)
    .filter((r) => rechecksRemaining(r) > 0)
    .filter((r) => r.lastRecheckStoryId !== story.storyId)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());

  for (const row of waiting) {
    const subject = registry.get(row.lessonId)?.subject;
    if (!subject) continue;
    let correct = 0;
    let total = 0;
    if (subject === 'decoding' || subject === 'word_practice') {
      const t = story.countedTry;
      if (!t || t.wordsTotal === 0) continue;
      total = 1;
      correct = t.wordsRight / t.wordsTotal >= PASS_RULE.minWordsRight ? 1 : 0;
    } else {
      // Each answer counts toward one lesson only, so two lessons on one skill need their own.
      story.answers.forEach((a, i) => {
        if (total >= rechecksRemaining(row) || used.has(i) || a.subskill !== subject) return;
        used.add(i);
        total += 1;
        if (a.correct) correct += 1;
      });
    }
    if (total === 0) continue;
    changed.push({
      ...row,
      recheckCorrect: row.recheckCorrect + correct,
      recheckTotal: row.recheckTotal + total,
      lastRecheckStoryId: story.storyId,
    });
  }
  return changed;
}
