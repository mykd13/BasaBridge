/** Small builders that keep the gold and safety set files readable. */
import type { StoryQuestion } from '@basabridge/contracts';
import type { GoldCase, GoldStory, SafetyCategory } from './schema';

type Options = [string, string, string, string];

export const literal = (
  question: string,
  options: Options,
  answerIndex: number,
  evidence: string,
): StoryQuestion => ({ skill: 'literal', word: null, question, options, answerIndex, evidence });

export const inferential = (
  question: string,
  options: Options,
  answerIndex: number,
  evidence: string,
): StoryQuestion => ({
  skill: 'inferential',
  word: null,
  question,
  options,
  answerIndex,
  evidence,
});

export const vocabulary = (
  word: string,
  question: string,
  options: Options,
  answerIndex: number,
  evidence: string,
): StoryQuestion => ({ skill: 'vocabulary', word, question, options, answerIndex, evidence });

/** A safe case drafted by an AI assistant. It counts in metrics only after a person reviews it. */
export const draftedSafe = (id: string, story: GoldStory): GoldCase => ({
  id,
  story,
  wrongKeys: [],
  unsafe: false,
  safetyCategory: null,
  source: 'drafted',
  reviewedBy: null,
  reviewedAt: null,
});

/** An unsafe case drafted by an AI assistant. It counts in metrics only after a person reviews it. */
export const draftedUnsafe = (
  id: string,
  safetyCategory: SafetyCategory,
  story: GoldStory,
): GoldCase => ({
  id,
  story,
  wrongKeys: [],
  unsafe: true,
  safetyCategory,
  source: 'drafted',
  reviewedBy: null,
  reviewedAt: null,
});
