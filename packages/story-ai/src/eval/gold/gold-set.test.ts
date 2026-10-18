import { TIERS, tierFor } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { checkStory, countWords, readingGrade } from '../../index';
import { GOLD_SET } from './gold-set';

const safe = GOLD_SET.filter((c) => c.wrongKeys.length === 0);

describe('gold set', () => {
  it('has two safe passages for every tier', () => {
    for (const tier of TIERS) {
      const inTier = safe.filter((c) => tierFor(c.story.level) === tier);
      expect(inTier.length, `tier ${tier.from}-${tier.to}`).toBe(2);
    }
  });

  it('labels every case safe', () => {
    expect(GOLD_SET.every((c) => !c.unsafe && c.safetyCategory === null)).toBe(true);
  });

  it('includes cases with planted wrong keys', () => {
    expect(GOLD_SET.filter((c) => c.wrongKeys.length > 0).length).toBeGreaterThanOrEqual(3);
  });

  it.each(GOLD_SET.map((c) => [c.id, c] as const))(
    '%s passes the deterministic checks with every question kept',
    (_id, c) => {
      const tier = tierFor(c.story.level);
      const words = countWords(c.story.text);
      const grade = readingGrade(c.story.text);
      expect(words, 'words').toBeGreaterThanOrEqual(tier.words.min);
      expect(words, 'words').toBeLessThanOrEqual(tier.words.max);
      expect(grade, 'reading grade').toBeLessThanOrEqual(tier.maxReadingGrade);

      const result = checkStory(c.story.text, c.story.questions, c.story.level);
      expect(result).toMatchObject({ ok: true, dropped: [] });
    },
  );
});
