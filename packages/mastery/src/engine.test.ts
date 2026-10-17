import type { TryAnalysis } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import { levelToTheta, prior, summarise, updatePosterior, type Posterior } from './ability';
import {
  focusFromAbility,
  readingMeasures,
  startingState,
  storyResult,
  summariseAll,
  updateAbility,
} from './engine';

const withItems = (p: Posterior, items: number): Posterior => ({ ...p, items });

const tryWith = (wordsRight: number, wordsTotal: number): TryAnalysis => ({
  completed: true,
  lastWordIndex: wordsTotal - 1,
  wordsTotal,
  wordsRight,
  seconds: 30,
  wordsPerMinute: 80,
  words: [],
});

describe('startingState', () => {
  it('fills missing scopes with a prior at the learner level and keeps stored ones', () => {
    const stored = withItems(prior(1), 4);
    const s = startingState(40, { literal: stored });
    expect(s.literal).toBe(stored);
    expect(summarise(s.vocabulary).mean).toBeCloseTo(levelToTheta(40), 1);
    expect(s.comprehension.items).toBe(0);
  });
});

describe('updateAbility', () => {
  it('updates the answer skill and comprehension, and leaves the others alone', () => {
    const s = startingState(40, {});
    const next = updateAbility(s, 'literal', { difficulty: 0, guess: 0.25, correct: true });
    expect(next.literal.items).toBe(1);
    expect(next.comprehension.items).toBe(1);
    expect(next.vocabulary).toBe(s.vocabulary);
    expect(next.inferential).toBe(s.inferential);
  });

  it('moves the estimate more for a correct answer that is harder to guess', () => {
    const s = startingState(40, {});
    const easyGuess = updateAbility(s, 'literal', { difficulty: 0, guess: 0.25, correct: true });
    const hardGuess = updateAbility(s, 'literal', { difficulty: 0, guess: 0.04, correct: true });
    expect(summarise(hardGuess.literal).mean).toBeGreaterThan(summarise(easyGuess.literal).mean);
  });
});

describe('confidence labels', () => {
  it('come from the uncertainty, not the number of answers', () => {
    const s = summariseAll({
      comprehension: withItems(prior(0, 0.3), 5),
      vocabulary: withItems(prior(0, 1), 5),
      literal: withItems(prior(0, 1), 5),
      inferential: withItems(prior(0, 1), 5),
    });
    expect(s.comprehension.confidence).toBe('steady');
    expect(s.vocabulary.confidence).toBe('early');
  });
});

describe('focusFromAbility', () => {
  const at = (mean: number, sd: number, items: number) =>
    summarise(withItems(prior(mean, sd), items));

  it('is null when no skill has been measured', () => {
    expect(focusFromAbility(summariseAll(startingState(40, {})))).toBeNull();
  });

  it('picks the measured skill with the lowest estimate', () => {
    expect(
      focusFromAbility({
        comprehension: at(0, 1, 6),
        vocabulary: at(0.5, 1, 2),
        literal: at(-0.5, 1, 2),
        inferential: at(0.2, 1, 2),
      }),
    ).toBe('literal');
  });

  it('ignores unmeasured skills even when their prior is lower', () => {
    expect(
      focusFromAbility({
        comprehension: at(0, 1, 2),
        vocabulary: at(-2, 1, 0),
        literal: at(0, 1, 1),
        inferential: at(0.4, 1, 1),
      }),
    ).toBe('literal');
  });

  it('breaks a tie towards the less certain skill', () => {
    expect(
      focusFromAbility({
        comprehension: at(0, 1, 4),
        vocabulary: at(0, 0.4, 2),
        literal: at(0, 0.9, 2),
        inferential: at(1, 1, 2),
      }),
    ).toBe('literal');
  });
});

describe('reading measures', () => {
  it('take words right and pace from the counted try', () => {
    expect(readingMeasures(tryWith(17, 20))).toEqual({ wordsRightShare: 0.85, wordsPerMinute: 80 });
  });

  it('treat a try with no words as zero words right', () => {
    expect(readingMeasures(tryWith(0, 0)).wordsRightShare).toBe(0);
  });

  it('build the story result from the try and the answers', () => {
    const r = storyResult(tryWith(18, 20), [
      { correct: true },
      { correct: false },
      { correct: true },
    ]);
    expect(r).toEqual({ wordsRightShare: 0.9, questionsCorrect: 2, questionsTotal: 3 });
  });
});

it('updatePosterior is still the single update step', () => {
  // Guard: updateAbility must not reimplement the maths.
  const p = prior(0);
  const e = { difficulty: 0, guess: 0.25, correct: true } as const;
  expect(updateAbility(startingState(50, { literal: p }), 'literal', e).literal).toEqual(
    updatePosterior(p, e),
  );
});
