import type { TryAnalysis } from '@basabridge/contracts';
import { EVIDENCE_RULE, MAX_LEVEL, PASS_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { levelToTheta, prior, summarise, updatePosterior, type Posterior } from './ability';
import {
  decideLevel,
  focusFromAbility,
  type LevelInput,
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

const passResult = {
  wordsRightShare: PASS_RULE.minWordsRight,
  questionsCorrect: PASS_RULE.minQuestionsCorrect,
  questionsTotal: 5,
};
const failResult = { wordsRightShare: 0.5, questionsCorrect: 0, questionsTotal: 5 };

const strongAbove = (level: number) =>
  withItems(prior(levelToTheta(level) + 2, 0.2), EVIDENCE_RULE.up.minItems);
const strongBelow = (level: number) =>
  withItems(prior(levelToTheta(level) - 2, 0.2), EVIDENCE_RULE.down.minItems);
const solid = [EVIDENCE_RULE.up.minWordsRight, EVIDENCE_RULE.up.minWordsRight];

const input = (over: Partial<LevelInput>): LevelInput => ({
  level: 40,
  passes: EVIDENCE_RULE.up.minPasses - 1,
  result: passResult,
  comprehension: strongAbove(40),
  recentWordsRight: solid,
  model: 'ability',
  ...over,
});

describe('decideLevel, ability model', () => {
  it('moves up with strong evidence, enough passes and solid words right', () => {
    const o = decideLevel(input({}));
    expect(o).toMatchObject({ level: 41, passes: 0, moved: 'up', passed: true, model: 'ability' });
    expect(o.readiness?.up).toBe(true);
  });

  it('stays when the decoding gate fails, and counts the pass', () => {
    const o = decideLevel(input({ recentWordsRight: [0.5, EVIDENCE_RULE.up.minWordsRight] }));
    expect(o).toMatchObject({ level: 40, passes: EVIDENCE_RULE.up.minPasses, moved: 'none' });
  });

  it('moves down with strong evidence of reading below the level', () => {
    const o = decideLevel(input({ comprehension: strongBelow(40), result: failResult, passes: 1 }));
    expect(o).toMatchObject({ level: 39, passes: 0, moved: 'down', passed: false });
  });

  it('never moves above the top level', () => {
    const o = decideLevel(input({ level: MAX_LEVEL, comprehension: strongAbove(MAX_LEVEL) }));
    expect(o.level).toBe(MAX_LEVEL);
    expect(o.moved).toBe('none');
  });
});

describe('decideLevel, simple model (fallback)', () => {
  it('moves up after the passes the old rule needs', () => {
    const o = decideLevel(
      input({ model: 'simple', passes: PASS_RULE.passesToLevelUp - 1, recentWordsRight: [] }),
    );
    expect(o).toMatchObject({
      level: 41,
      passes: 0,
      moved: 'up',
      model: 'simple',
      readiness: null,
    });
  });

  it('moves down after a very weak story', () => {
    const o = decideLevel(input({ model: 'simple', result: failResult }));
    expect(o).toMatchObject({ level: 39, moved: 'down' });
  });
});
