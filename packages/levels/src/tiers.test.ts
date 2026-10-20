import { Level } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import {
  MAX_LEVEL,
  MIN_LEVEL,
  PASS_RULE,
  QUESTIONS_PER_STORY,
  TIERS,
  tierFor,
  triesFor,
  type Tier,
} from './index';

/** Each tier with the one before it. The first tier has no previous tier, so it is skipped. */
function pairs(tiers: readonly Readonly<Tier>[]) {
  return tiers.slice(1).map((cur, i) => ({ prev: tiers[i]!, cur }));
}

const ALL_LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);

describe('tiers have no gaps or overlaps', () => {
  it('start at the minimum level and end at the maximum level', () => {
    expect(TIERS[0]!.from).toBe(MIN_LEVEL);
    expect(TIERS[TIERS.length - 1]!.to).toBe(MAX_LEVEL);
  });

  it('run forward inside each tier', () => {
    for (const t of TIERS) expect(t.from).toBeLessThanOrEqual(t.to);
  });

  it('start each tier one level after the previous tier ends', () => {
    for (const { prev, cur } of pairs(TIERS)) expect(cur.from).toBe(prev.to + 1);
  });

  it('give every level from 1 to 100 exactly one tier', () => {
    for (const l of ALL_LEVELS) {
      const tier = tierFor(l);
      expect(l).toBeGreaterThanOrEqual(tier.from);
      expect(l).toBeLessThanOrEqual(tier.to);
      expect(TIERS.filter((t) => l >= t.from && l <= t.to)).toHaveLength(1);
    }
  });
});

describe('tries', () => {
  it('never rise as the level rises', () => {
    let last = Infinity;
    for (const l of ALL_LEVELS) {
      const t = triesFor(l) ?? Infinity;
      expect(t, `level ${l}`).toBeLessThanOrEqual(last);
      last = t;
    }
  });

  it('are unlimited only in the first tier and whole numbers of 1 or more after that', () => {
    expect(TIERS[0]!.tries).toBeNull();
    for (const t of TIERS.slice(1)) {
      expect(Number.isInteger(t.tries)).toBe(true);
      expect(t.tries).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('story length', () => {
  it('never shrinks from one tier to the next', () => {
    for (const { prev, cur } of pairs(TIERS)) {
      expect(cur.words.min).toBeGreaterThanOrEqual(prev.words.min);
      expect(cur.words.max).toBeGreaterThanOrEqual(prev.words.max);
    }
  });

  it('is a positive whole-number range inside each tier', () => {
    for (const t of TIERS) {
      expect(Number.isInteger(t.words.min)).toBe(true);
      expect(Number.isInteger(t.words.max)).toBe(true);
      expect(t.words.min).toBeGreaterThan(0);
      expect(t.words.min).toBeLessThanOrEqual(t.words.max);
    }
  });
});

describe('reading grade', () => {
  it('never falls from one tier to the next', () => {
    for (const { prev, cur } of pairs(TIERS)) {
      expect(cur.maxReadingGrade).toBeGreaterThanOrEqual(prev.maxReadingGrade);
    }
  });

  it('is above zero in every tier', () => {
    for (const t of TIERS) expect(t.maxReadingGrade).toBeGreaterThan(0);
  });
});

describe('vocabulary', () => {
  it('never gets stricter from one tier to the next', () => {
    for (const { prev, cur } of pairs(TIERS)) {
      expect(cur.vocabulary.maxRank).toBeGreaterThanOrEqual(prev.vocabulary.maxRank);
      expect(cur.vocabulary.minKnownShare).toBeLessThanOrEqual(prev.vocabulary.minKnownShare);
      expect(cur.vocabulary.maxNewWords).toBeGreaterThanOrEqual(prev.vocabulary.maxNewWords);
    }
  });

  it('keeps the known share between 0 and 1 and the counts whole', () => {
    for (const t of TIERS) {
      expect(t.vocabulary.minKnownShare).toBeGreaterThan(0);
      expect(t.vocabulary.minKnownShare).toBeLessThanOrEqual(1);
      expect(Number.isInteger(t.vocabulary.maxRank) && t.vocabulary.maxRank >= 1).toBe(true);
      expect(Number.isInteger(t.vocabulary.maxNewWords) && t.vocabulary.maxNewWords >= 0).toBe(
        true,
      );
    }
  });
});

describe('idioms', () => {
  it('are not allowed in the first tier', () => {
    expect(TIERS[0]!.idiomsAllowed).toBe(false);
  });

  it('stay allowed once a tier allows them', () => {
    for (const { prev, cur } of pairs(TIERS)) {
      if (prev.idiomsAllowed) expect(cur.idiomsAllowed).toBe(true);
    }
  });
});

describe('pass rule values', () => {
  it('keeps the words share between 0 and 1', () => {
    expect(PASS_RULE.minWordsRight).toBeGreaterThan(0);
    expect(PASS_RULE.minWordsRight).toBeLessThanOrEqual(1);
  });

  it('keeps the very weak share between 0 and 1', () => {
    expect(PASS_RULE.veryWeakShare).toBeGreaterThan(0);
    expect(PASS_RULE.veryWeakShare).toBeLessThan(1);
  });

  it('needs a whole number of correct answers from 1 to QUESTIONS_PER_STORY', () => {
    expect(Number.isInteger(PASS_RULE.minQuestionsCorrect)).toBe(true);
    expect(PASS_RULE.minQuestionsCorrect).toBeGreaterThanOrEqual(1);
    expect(PASS_RULE.minQuestionsCorrect).toBeLessThanOrEqual(QUESTIONS_PER_STORY);
  });

  it('needs a whole number of passes, at least 1, to level up', () => {
    expect(Number.isInteger(PASS_RULE.passesToLevelUp)).toBe(true);
    expect(PASS_RULE.passesToLevelUp).toBeGreaterThanOrEqual(1);
  });

  it('never makes a pass also very weak', () => {
    expect(PASS_RULE.veryWeakShare).toBeLessThan(
      PASS_RULE.minQuestionsCorrect / QUESTIONS_PER_STORY,
    );
  });
});

describe('contracts', () => {
  it('agree with the Level schema on the lowest and highest level', () => {
    expect(Level.safeParse(MIN_LEVEL).success).toBe(true);
    expect(Level.safeParse(MAX_LEVEL).success).toBe(true);
    expect(Level.safeParse(MIN_LEVEL - 1).success).toBe(false);
    expect(Level.safeParse(MAX_LEVEL + 1).success).toBe(false);
  });
});

describe('data', () => {
  it('is frozen, so nothing can change a tier at run time', () => {
    expect(() => {
      (TIERS[0] as Tier).tries = 9;
    }).toThrow();
    expect(() => {
      (TIERS[0]!.words as Tier['words']).max = 999;
    }).toThrow();
    expect(() => {
      (TIERS as Tier[]).push(TIERS[0] as Tier);
    }).toThrow();
  });
});
