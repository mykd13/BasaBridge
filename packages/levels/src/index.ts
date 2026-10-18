/**
 * Level table, tries per story and pass rules. All numbers here are placeholders to tune
 * (see docs/PLAN.md section 6). Keep them as data so tuning needs no code changes elsewhere.
 * Seed implementation, owner: Jhade (BB-14).
 */

export interface Tier {
  from: number;
  to: number;
  /** Story length range in words. */
  words: { min: number; max: number };
  /** Maximum Flesch-Kincaid reading grade for stories in this tier. */
  maxReadingGrade: number;
  /** Tries per story. null means unlimited. */
  tries: number | null;
  description: string;
}

export const TIERS: readonly Tier[] = [
  {
    from: 1,
    to: 10,
    words: { min: 5, max: 15 },
    maxReadingGrade: 2,
    tries: null,
    description: 'Everyday words, 5 to 8 words per sentence',
  },
  {
    from: 11,
    to: 30,
    words: { min: 25, max: 50 },
    maxReadingGrade: 3.5,
    tries: 5,
    description: 'A few new words explained by context',
  },
  {
    from: 31,
    to: 55,
    words: { min: 50, max: 90 },
    maxReadingGrade: 5,
    tries: 4,
    description: 'Joined sentences, some topic words',
  },
  {
    from: 56,
    to: 75,
    words: { min: 90, max: 140 },
    maxReadingGrade: 6.5,
    tries: 3,
    description: 'Varied sentences, several topic words',
  },
  {
    from: 76,
    to: 90,
    words: { min: 140, max: 200 },
    maxReadingGrade: 8,
    tries: 2,
    description: 'Long sentences, subject words',
  },
  {
    from: 91,
    to: 100,
    words: { min: 200, max: 260 },
    maxReadingGrade: 10,
    tries: 1,
    description: 'Advanced words, figurative language',
  },
];

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;

export const PASS_RULE = {
  /** Share of words read right on the counted try. */
  minWordsRight: 0.85,
  /** Questions correct out of five. */
  minQuestionsCorrect: 3,
  /** Passed stories at one level needed to move up. */
  passesToLevelUp: 3,
} as const;

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

/** First level for a new learner. Everyone starts at the bottom. */
export const STARTING_LEVEL = 1;

export * from './evidence';
export * from './listen';
