import { describe, expect, it } from 'vitest';
import {
  MAX_LEVEL,
  MIN_LEVEL,
  PLACEMENT_BANK,
  placementStepFor,
  placementSteps,
  TIERS,
  hasTriesLeft,
  isPass,
  isVeryWeak,
  tierFor,
  triesFor,
} from './index';

describe('tiers', () => {
  it('cover every level from 1 to 100 exactly once', () => {
    for (let l = MIN_LEVEL; l <= MAX_LEVEL; l++) {
      expect(TIERS.filter((t) => l >= t.from && l <= t.to)).toHaveLength(1);
    }
  });

  it('gives unlimited tries at level 1 and fewer tries at higher levels', () => {
    expect(triesFor(1)).toBeNull();
    expect(triesFor(24)).toBe(5);
    expect(triesFor(70)).toBe(3);
    expect(triesFor(100)).toBe(1);
  });

  it('never gives more tries as the level rises', () => {
    let last = Infinity;
    for (let l = MIN_LEVEL; l <= MAX_LEVEL; l++) {
      const t = triesFor(l) ?? Infinity;
      expect(t).toBeLessThanOrEqual(last);
      last = t;
    }
  });

  it('makes stories longer as the level rises', () => {
    expect(tierFor(100).words.max).toBeGreaterThan(tierFor(1).words.max);
  });

  it('clamps out-of-range levels', () => {
    expect(tierFor(0)).toBe(tierFor(1));
    expect(tierFor(500)).toBe(tierFor(100));
  });
});

describe('tries', () => {
  it('stops at the limit', () => {
    expect(hasTriesLeft(24, 4)).toBe(true);
    expect(hasTriesLeft(24, 5)).toBe(false);
    expect(hasTriesLeft(1, 999)).toBe(true);
  });
});

describe('pass rule', () => {
  it('needs 85% words right and 3 of 5 questions', () => {
    expect(isPass({ wordsRightShare: 0.9, questionsCorrect: 4, questionsTotal: 5 })).toBe(true);
    expect(isPass({ wordsRightShare: 0.8, questionsCorrect: 5, questionsTotal: 5 })).toBe(false);
    expect(isPass({ wordsRightShare: 0.95, questionsCorrect: 2, questionsTotal: 5 })).toBe(false);
  });

  it('flags very weak results', () => {
    expect(isVeryWeak({ wordsRightShare: 0.9, questionsCorrect: 2, questionsTotal: 5 })).toBe(true);
    expect(isVeryWeak({ wordsRightShare: 0.9, questionsCorrect: 3, questionsTotal: 5 })).toBe(
      false,
    );
  });
});

describe('placement bank steps', () => {
  it('has twenty steps of five from 5 to 100', () => {
    const steps = placementSteps();
    expect(steps).toHaveLength(20);
    expect(steps[0]).toBe(5);
    expect(steps[steps.length - 1]).toBe(MAX_LEVEL);
    expect(steps.every((s) => s % PLACEMENT_BANK.stepSize === 0)).toBe(true);
  });

  it('needs about forty stories in all', () => {
    expect(placementSteps().length * PLACEMENT_BANK.minStoriesPerStep).toBe(40);
  });

  it('rounds a level to the nearest step', () => {
    expect(placementStepFor(MIN_LEVEL)).toBe(5);
    expect(placementStepFor(2)).toBe(5);
    expect(placementStepFor(7)).toBe(5);
    expect(placementStepFor(8)).toBe(10);
    expect(placementStepFor(42)).toBe(40);
    expect(placementStepFor(43)).toBe(45);
    expect(placementStepFor(97)).toBe(95);
    expect(placementStepFor(98)).toBe(100);
  });

  it('clamps levels outside 1 to 100', () => {
    expect(placementStepFor(-10)).toBe(5);
    expect(placementStepFor(0)).toBe(5);
    expect(placementStepFor(140)).toBe(100);
  });

  it('maps every level to a step in the bank', () => {
    const steps = new Set(placementSteps());
    for (let l = MIN_LEVEL; l <= MAX_LEVEL; l++) {
      expect(steps.has(placementStepFor(l))).toBe(true);
    }
  });
});
