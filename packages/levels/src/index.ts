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

export function isPass(r: StoryResult): boolean {
  return (
    r.wordsRightShare >= PASS_RULE.minWordsRight &&
    r.questionsCorrect >= PASS_RULE.minQuestionsCorrect
  );
}

/** A weak result is one where less than half the questions were right. */
export function isVeryWeak(r: StoryResult): boolean {
  return r.questionsTotal > 0 && r.questionsCorrect / r.questionsTotal <= 0.4;
}
