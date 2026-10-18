import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, MIN_LEVEL } from './index';
import { PLACEMENT_RULE } from './evidence';

describe('placement rule', () => {
  it('reads between the minimum and maximum number of stories', () => {
    expect(PLACEMENT_RULE.minStories).toBeGreaterThan(0);
    expect(PLACEMENT_RULE.minStories).toBeLessThanOrEqual(PLACEMENT_RULE.maxStories);
  });

  it('keeps the re-check shorter than a full placement', () => {
    expect(PLACEMENT_RULE.recheckStories).toBeGreaterThan(0);
    expect(PLACEMENT_RULE.recheckStories).toBeLessThan(PLACEMENT_RULE.maxStories);
  });

  it('starts every grade inside the level range', () => {
    const starts = [...Object.values(PLACEMENT_RULE.gradeStart), PLACEMENT_RULE.defaultStart];
    for (const level of starts) {
      expect(level).toBeGreaterThanOrEqual(MIN_LEVEL);
      expect(level).toBeLessThanOrEqual(MAX_LEVEL);
    }
  });
});
