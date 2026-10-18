/**
 * Level lookups and pass checks. All numbers live in tiers.ts; this file holds the functions only.
 * Owner: Jhade (BB-14).
 */

import { MAX_LEVEL, MIN_LEVEL, PASS_RULE, TIERS, type Tier } from './tiers';

export * from './tiers';

export function tierFor(level: number): Tier {
  const l = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
  const tier = TIERS.find((t) => l >= t.from && l <= t.to);
  if (!tier) throw new Error(`No tier for level ${l}`);
  return tier;
}

/** Tries allowed per story at a level. null means unlimited. */
export function triesFor(level: number): number | null {
  return tierFor(level).tries;
}

export function hasTriesLeft(level: number, triesUsed: number): boolean {
  const allowed = triesFor(level);
  return allowed === null || triesUsed < allowed;
}

export interface StoryResult {
  wordsRightShare: number;
  questionsCorrect: number;
  questionsTotal: number;
}

/**
 * Counts correct answers, not a share. A story the verifier cut to four questions still needs three
 * right. Kept on purpose until the educator review.
 */
export function isPass(r: StoryResult): boolean {
  return (
    r.wordsRightShare >= PASS_RULE.minWordsRight &&
    r.questionsCorrect >= PASS_RULE.minQuestionsCorrect
  );
}

/** Very weak: at most PASS_RULE.veryWeakShare (40%) of questions right. Moves the learner down one level. */
export function isVeryWeak(r: StoryResult): boolean {
  return r.questionsTotal > 0 && r.questionsCorrect / r.questionsTotal <= PASS_RULE.veryWeakShare;
}

/** Question type rules (docs/PLAN.md section 6.1, ADR 0003). */
export const QUESTION_RULE = {
  /** From this level each story has at least one choose-all or order-the-events question. Below it, multiple choice only. */
  hardTypeFromLevel: 11,
} as const;

/** True when stories at this level need a hard-to-guess question type and may use one. */
export function allowsHardQuestion(level: number): boolean {
  return Math.round(level) >= QUESTION_RULE.hardTypeFromLevel;
}

export * from './evidence';
export * from './listen';
