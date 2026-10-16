import { describe, expect, it } from 'vitest';
import { isRecentTitle, pickTopic, TOPIC_SEEDS } from './topics';

/** Small deterministic generator (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('TOPIC_SEEDS', () => {
  it('is not empty and has no duplicates', () => {
    expect(TOPIC_SEEDS.length).toBeGreaterThan(0);
    expect(new Set(TOPIC_SEEDS.map((s) => s.toLowerCase())).size).toBe(TOPIC_SEEDS.length);
  });
});

describe('pickTopic', () => {
  it('gives the same output for the same input and random source', () => {
    expect(pickTopic(['a lost coin'], seeded(7))).toBe(pickTopic(['a lost coin'], seeded(7)));
  });

  it('never picks a recent topic while others remain', () => {
    const recent = TOPIC_SEEDS.slice(0, TOPIC_SEEDS.length - 1);
    const left = TOPIC_SEEDS[TOPIC_SEEDS.length - 1];
    const rnd = seeded(1);
    for (let i = 0; i < 50; i++) expect(pickTopic([...recent], rnd)).toBe(left);
  });

  it('still returns a seed when every seed is recent, preferring the least recent', () => {
    const recent = [...TOPIC_SEEDS]; // most recent first
    const oldest = TOPIC_SEEDS[TOPIC_SEEDS.length - 1];
    expect(pickTopic(recent, seeded(3))).toBe(oldest);
  });

  it('handles an empty recent list and extreme random values', () => {
    expect(TOPIC_SEEDS).toContain(pickTopic([], () => 0));
    expect(TOPIC_SEEDS).toContain(pickTopic([], () => 1));
  });
});

describe('isRecentTitle', () => {
  it('ignores case, punctuation and a leading article', () => {
    expect(isRecentTitle('The Mango Tree!', ['mango tree'])).toBe(true);
    expect(isRecentTitle('A Rainy Day', ["an rainy day."])).toBe(true);
  });

  it('is false for different titles and empty titles', () => {
    expect(isRecentTitle('The Lost Coin', ['The Mango Tree'])).toBe(false);
    expect(isRecentTitle('', [''])).toBe(false);
  });
});
