/**
 * Level table, tries per story and pass rule, as data only. No logic lives here.
 * Everything else (story-ai, mastery, the web app) reads these numbers and never copies them.
 * See packages/levels/README.md for what each tier means and how to tune it.
 */
import { deepFreeze } from './freeze';

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

export const TIERS: readonly Readonly<Tier>[] = deepFreeze<Tier[]>([
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
]);

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;

/** First level for a new learner. Everyone starts at the bottom. */
export const STARTING_LEVEL = 1;

/** Questions asked after each story. The story generator and the pass rule both read this. */
export const QUESTIONS_PER_STORY = 5;

/**
 * Fewest valid questions a story may keep after the checks drop bad ones. A story asks
 * QUESTIONS_PER_STORY; the checks may drop one and still show the story.
 */
export const MIN_QUESTIONS_PER_STORY = 4;

export const PASS_RULE = deepFreeze({
  /** Share of words read right on the counted try. */
  minWordsRight: 0.85,
  /** Questions correct out of QUESTIONS_PER_STORY. */
  minQuestionsCorrect: 3,
  /** Passed stories at one level needed to move up. */
  passesToLevelUp: 3,
  /** A result is very weak when the share of questions right is at or below this. */
  veryWeakShare: 0.4,
} as const);
