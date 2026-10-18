import { Level, QuestionType, SubSkill } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_RULE,
  LISTEN_THEN_READ,
  MAX_LEVEL,
  MIN_LEVEL,
  PASS_RULE,
  PLACEMENT_RULE,
} from './index';

function isProbability(p: number) {
  return p > 0 && p < 1;
}

function isPositiveInteger(n: number) {
  return Number.isInteger(n) && n >= 1;
}

describe('guess rates', () => {
  it('cover every question type in the contracts, and nothing else', () => {
    expect(Object.keys(EVIDENCE_RULE.guess).sort()).toEqual([...QuestionType.options].sort());
  });

  it('are probabilities', () => {
    for (const p of Object.values(EVIDENCE_RULE.guess)) expect(isProbability(p)).toBe(true);
  });

  it('fall as question types get harder to guess', () => {
    const { multiple_choice, choose_all, order_events } = EVIDENCE_RULE.guess;
    expect(choose_all).toBeLessThan(multiple_choice);
    expect(order_events).toBeLessThan(choose_all);
  });
});

describe('evidence weights and discrimination', () => {
  it('give discrimination a positive value', () => {
    expect(EVIDENCE_RULE.discrimination).toBeGreaterThan(0);
  });

  it('count rushed answers and supported tries for less than a normal answer, but not nothing', () => {
    for (const w of Object.values(EVIDENCE_RULE.weight)) expect(isProbability(w)).toBe(true);
  });
});

describe('level movement thresholds', () => {
  it('use probabilities above one half, so movement needs more than a coin flip', () => {
    expect(isProbability(EVIDENCE_RULE.up.probability)).toBe(true);
    expect(isProbability(EVIDENCE_RULE.down.probability)).toBe(true);
    expect(EVIDENCE_RULE.up.probability).toBeGreaterThan(0.5);
    expect(EVIDENCE_RULE.down.probability).toBeGreaterThan(0.5);
  });

  it('use margins of zero or more', () => {
    expect(EVIDENCE_RULE.up.margin).toBeGreaterThanOrEqual(0);
    expect(EVIDENCE_RULE.down.margin).toBeGreaterThanOrEqual(0);
  });

  it('need a whole number of answers and passes, at least 1', () => {
    expect(isPositiveInteger(EVIDENCE_RULE.up.minItems)).toBe(true);
    expect(isPositiveInteger(EVIDENCE_RULE.up.minPasses)).toBe(true);
    expect(isPositiveInteger(EVIDENCE_RULE.down.minItems)).toBe(true);
  });

  it('keep the words-right share for moving up between 0 and 1', () => {
    expect(EVIDENCE_RULE.up.minWordsRight).toBeGreaterThan(0);
    expect(EVIDENCE_RULE.up.minWordsRight).toBeLessThanOrEqual(1);
  });

  it('never ask less reading accuracy to move up than to pass a story', () => {
    expect(EVIDENCE_RULE.up.minWordsRight).toBeGreaterThanOrEqual(PASS_RULE.minWordsRight);
  });
});

describe('rushed answers', () => {
  it('use a positive base time and a per-word allowance of zero or more', () => {
    expect(EVIDENCE_RULE.rushed.baseMs).toBeGreaterThan(0);
    expect(EVIDENCE_RULE.rushed.perWordMs).toBeGreaterThanOrEqual(0);
  });
});

describe('sub-skill difficulty offsets', () => {
  it('cover every sub-skill in the contracts, and nothing else', () => {
    expect(Object.keys(EVIDENCE_RULE.subskillOffset).sort()).toEqual([...SubSkill.options].sort());
  });

  it('are finite numbers', () => {
    for (const o of Object.values(EVIDENCE_RULE.subskillOffset)) {
      expect(Number.isFinite(o)).toBe(true);
    }
  });
});

describe('placement', () => {
  const grades = Object.keys(PLACEMENT_RULE.gradeStart)
    .map(Number)
    .sort((a, b) => a - b);

  it('uses a whole number of stories, at least 1, with the minimum at or below the maximum', () => {
    expect(isPositiveInteger(PLACEMENT_RULE.minStories)).toBe(true);
    expect(isPositiveInteger(PLACEMENT_RULE.maxStories)).toBe(true);
    expect(PLACEMENT_RULE.minStories).toBeLessThanOrEqual(PLACEMENT_RULE.maxStories);
  });

  it('stops at a positive certainty and starts zero or more deviations below the estimate', () => {
    expect(PLACEMENT_RULE.stopSd).toBeGreaterThan(0);
    expect(PLACEMENT_RULE.conservative).toBeGreaterThanOrEqual(0);
  });

  it('steps a whole number of levels that fits inside the level range', () => {
    expect(isPositiveInteger(PLACEMENT_RULE.maxStep)).toBe(true);
    expect(PLACEMENT_RULE.maxStep).toBeLessThanOrEqual(MAX_LEVEL - MIN_LEVEL);
  });

  it('keeps the low-decoding share between 0 and 1', () => {
    expect(PLACEMENT_RULE.lowDecoding).toBeGreaterThan(0);
    expect(PLACEMENT_RULE.lowDecoding).toBeLessThanOrEqual(1);
  });

  it('allows a retake after a whole number of days, at least 1', () => {
    expect(isPositiveInteger(PLACEMENT_RULE.retakeAfterDays)).toBe(true);
  });

  it('lists grades 1 upward with no gaps', () => {
    expect(grades).toEqual(Array.from({ length: grades.length }, (_, i) => i + 1));
  });

  it('starts higher as the grade rises', () => {
    for (let i = 1; i < grades.length; i++) {
      const prev = PLACEMENT_RULE.gradeStart[grades[i - 1]!]!;
      const cur = PLACEMENT_RULE.gradeStart[grades[i]!]!;
      expect(cur, `grade ${grades[i]}`).toBeGreaterThan(prev);
    }
  });

  it('starts every grade, and the default, at a real level', () => {
    for (const g of grades) {
      expect(Level.safeParse(PLACEMENT_RULE.gradeStart[g]).success, `grade ${g}`).toBe(true);
    }
    expect(Level.safeParse(PLACEMENT_RULE.defaultStart).success).toBe(true);
  });
});

describe('listen-then-read', () => {
  it('is offered up to a real level', () => {
    expect(Level.safeParse(LISTEN_THEN_READ.maxLevel).success).toBe(true);
  });

  it('plays the model voice slower than normal, but not stopped', () => {
    expect(isProbability(LISTEN_THEN_READ.pace)).toBe(true);
  });
});

describe('rule data', () => {
  it('is frozen, so nothing can change a rule at run time', () => {
    const rules: object[] = [
      PASS_RULE,
      EVIDENCE_RULE,
      EVIDENCE_RULE.guess,
      EVIDENCE_RULE.weight,
      EVIDENCE_RULE.up,
      EVIDENCE_RULE.down,
      EVIDENCE_RULE.rushed,
      EVIDENCE_RULE.subskillOffset,
      PLACEMENT_RULE,
      PLACEMENT_RULE.gradeStart,
      LISTEN_THEN_READ,
    ];
    for (const rule of rules) expect(Object.isFrozen(rule)).toBe(true);
    expect(() => {
      (EVIDENCE_RULE.up as { probability: number }).probability = 0.1;
    }).toThrow();
  });
});

describe('placement re-check', () => {
  it('has a positive length shorter than a full placement', () => {
    expect(isPositiveInteger(PLACEMENT_RULE.recheckStories)).toBe(true);
    expect(PLACEMENT_RULE.recheckStories).toBeLessThan(PLACEMENT_RULE.maxStories);
  });
});
