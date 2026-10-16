import { describe, expect, it } from 'vitest';
import {
  GRID,
  evidenceWeight,
  guessFor,
  isRushed,
  itemDifficulty,
  levelReadiness,
  levelToTheta,
  pCorrect,
  prior,
  probAbove,
  summarise,
  thetaToLevel,
  updateAll,
  updatePosterior,
  type ItemEvidence,
} from './ability';

const item = (correct: boolean, over: Partial<ItemEvidence> = {}): ItemEvidence => ({
  difficulty: 0,
  guess: 0.25,
  correct,
  ...over,
});

describe('level and ability scales', () => {
  it('maps level 1 to -3 and level 100 to +3 and back', () => {
    expect(levelToTheta(1)).toBeCloseTo(-3, 5);
    expect(levelToTheta(100)).toBeCloseTo(3, 5);
    for (const l of [1, 24, 50, 77, 100]) expect(thetaToLevel(levelToTheta(l))).toBe(l);
  });

  it('clamps out-of-range input', () => {
    expect(levelToTheta(0)).toBeCloseTo(-3, 5);
    expect(thetaToLevel(99)).toBe(100);
    expect(thetaToLevel(-99)).toBe(1);
  });
});

describe('pCorrect', () => {
  it('never drops below the guessing rate', () => {
    expect(pCorrect(-4, { difficulty: 2, guess: 0.25 })).toBeGreaterThanOrEqual(0.25);
  });

  it('rises with ability', () => {
    const lo = pCorrect(-1, { difficulty: 0, guess: 0.25 });
    const hi = pCorrect(1, { difficulty: 0, guess: 0.25 });
    expect(hi).toBeGreaterThan(lo);
  });

  it('is halfway between guessing and certainty when ability equals difficulty', () => {
    expect(pCorrect(0, { difficulty: 0, guess: 0.25 })).toBeCloseTo(0.25 + 0.75 * 0.5, 5);
  });
});

describe('posterior updates', () => {
  it('starts as a distribution that sums to 1', () => {
    const p = prior(0, 1);
    expect(p.weights).toHaveLength(GRID.length);
    expect(p.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('moves up after correct answers and down after wrong ones', () => {
    const start = summarise(prior(0, 1)).mean;
    const up = summarise(updateAll(prior(0, 1), [item(true), item(true), item(true)])).mean;
    const down = summarise(updateAll(prior(0, 1), [item(false), item(false), item(false)])).mean;
    expect(up).toBeGreaterThan(start);
    expect(down).toBeLessThan(start);
  });

  it('shrinks the uncertainty as evidence arrives', () => {
    const before = summarise(prior(0, 1)).sd;
    const after = summarise(
      updateAll(prior(0, 1), [item(true), item(false), item(true), item(false), item(true)]),
    ).sd;
    expect(after).toBeLessThan(before);
  });

  it('treats a lucky guess as weaker evidence than a correct answer to a no-guess item', () => {
    const guessy = summarise(updatePosterior(prior(0, 1), item(true, { guess: 0.5 }))).mean;
    const solid = summarise(updatePosterior(prior(0, 1), item(true, { guess: 0.04 }))).mean;
    expect(solid).toBeGreaterThan(guessy);
  });

  it('moves less for a rushed answer', () => {
    const normal = summarise(updatePosterior(prior(0, 1), item(true))).mean;
    const rushed = summarise(updatePosterior(prior(0, 1), item(true, { weight: 0.3 }))).mean;
    expect(rushed).toBeGreaterThan(0);
    expect(rushed).toBeLessThan(normal);
  });

  it('gives a stronger signal for a hard item answered correctly', () => {
    const easy = summarise(updatePosterior(prior(0, 1), item(true, { difficulty: -2 }))).mean;
    const hard = summarise(updatePosterior(prior(0, 1), item(true, { difficulty: 2 }))).mean;
    expect(hard).toBeGreaterThan(easy);
  });

  it('keeps a random 1 in 4 pattern near the middle instead of reading it as strong', () => {
    const answers = [true, false, false, false, true, false, false, false];
    const s = summarise(
      updateAll(
        prior(0, 1),
        answers.map((c) => item(c)),
      ),
    );
    const strong = summarise(
      updateAll(
        prior(0, 1),
        answers.map(() => item(true)),
      ),
    );
    expect(s.mean).toBeLessThan(strong.mean);
    expect(Math.abs(s.mean)).toBeLessThan(1.5);
  });
});

describe('confidence', () => {
  it('has none with no answers and improves with more', () => {
    expect(summarise(prior(0, 1)).confidence).toBe('none');
    const some = summarise(updateAll(prior(0, 1), [item(true), item(true)]));
    expect(['early', 'building', 'steady']).toContain(some.confidence);
  });
});

describe('items', () => {
  it('make harder sub-skills harder at the same level', () => {
    expect(itemDifficulty(40, 'conclusion')).toBeGreaterThan(itemDifficulty(40, 'key_detail'));
  });

  it('have lower guess rates for harder question types', () => {
    expect(guessFor('order_events')).toBeLessThan(guessFor('choose_all'));
    expect(guessFor('choose_all')).toBeLessThan(guessFor('multiple_choice'));
    expect(guessFor(undefined)).toBe(guessFor('multiple_choice'));
  });
});

describe('rushed answers and weights', () => {
  it('flags answers faster than the allowance', () => {
    expect(isRushed(500, 20)).toBe(true);
    expect(isRushed(8000, 20)).toBe(false);
  });

  it('gives a longer allowance for more words on screen', () => {
    expect(isRushed(2500, 5)).toBe(false);
    expect(isRushed(2500, 60)).toBe(true);
  });

  it('combines the rushed and supported discounts', () => {
    expect(evidenceWeight({ rushed: false, supportedTry: false })).toBe(1);
    expect(evidenceWeight({ rushed: true, supportedTry: false })).toBeCloseTo(0.3, 5);
    expect(evidenceWeight({ rushed: true, supportedTry: true })).toBeCloseTo(0.21, 5);
  });
});

describe('levelReadiness', () => {
  const strong = updateAll(
    prior(levelToTheta(30), 0.5),
    Array.from({ length: 14 }, () => item(true, { difficulty: levelToTheta(30), guess: 0.1 })),
  );
  const weak = updateAll(
    prior(levelToTheta(30), 0.5),
    Array.from({ length: 12 }, () => item(false, { difficulty: levelToTheta(30), guess: 0.25 })),
  );
  const ctx = { items: 14, passedStories: 3, recentWordsRight: [0.9, 0.92] };

  it('moves up with strong evidence, passes and good decoding', () => {
    expect(probAbove(strong, levelToTheta(30) + 0.25)).toBeGreaterThan(0.85);
    const r = levelReadiness(strong, 30, ctx);
    expect(r.up).toBe(true);
    expect(r.down).toBe(false);
  });

  it('does not move up when decoding is weak', () => {
    const r = levelReadiness(strong, 30, { ...ctx, recentWordsRight: [0.9, 0.7] });
    expect(r.up).toBe(false);
  });

  it('does not move up without enough passes or items', () => {
    expect(levelReadiness(strong, 30, { ...ctx, passedStories: 1 }).up).toBe(false);
    expect(levelReadiness(strong, 30, { ...ctx, items: 5 }).up).toBe(false);
  });

  it('moves down with strong evidence of being below the level', () => {
    const r = levelReadiness(weak, 30, {
      items: 12,
      passedStories: 0,
      recentWordsRight: [0.9, 0.9],
    });
    expect(r.down).toBe(true);
    expect(r.up).toBe(false);
  });

  it('never moves below level 1 or above level 100', () => {
    expect(
      levelReadiness(weak, 1, { items: 12, passedStories: 0, recentWordsRight: [] }).down,
    ).toBe(false);
    expect(levelReadiness(strong, 100, ctx).up).toBe(false);
  });
});
