import { describe, expect, it } from 'vitest';
import { IDIOM_COUNT, countIdioms } from './idioms';

describe('countIdioms', () => {
  it('finds listed idioms in any case', () => {
    expect(countIdioms('It was raining cats and dogs.')).toBe(1);
    expect(countIdioms('Out of the blue, Ana called.')).toBe(1);
  });

  it('matches verb endings and possessives', () => {
    expect(countIdioms('Ben spills the beans.')).toBe(1);
    expect(countIdioms('Kuya is pulling her leg.')).toBe(1);
    expect(countIdioms('The test was over by the skin of their teeth.')).toBe(1);
  });

  it("matches a piece of cake after is, was or 's, with curly apostrophes", () => {
    expect(countIdioms('The test was a piece of cake.')).toBe(1);
    expect(countIdioms('It’s a piece of cake.')).toBe(1);
  });

  it('does not flag the same words used literally', () => {
    expect(countIdioms('Lola gave Mia a piece of cake.')).toBe(0);
    expect(countIdioms('The kite went up in the air over her head.')).toBe(0);
    expect(countIdioms('They rang the school bell.')).toBe(0);
  });

  it('needs whole words', () => {
    expect(countIdioms('The rule of thumbs')).toBe(0);
    expect(countIdioms('time flies')).toBe(1);
    expect(countIdioms('overtime flies')).toBe(0);
  });

  it('counts each different idiom once', () => {
    expect(countIdioms('Time flies. Time flies. It was a piece of cake.')).toBe(2);
  });

  it('has a list of common idioms', () => {
    expect(IDIOM_COUNT).toBeGreaterThanOrEqual(50);
  });
});
