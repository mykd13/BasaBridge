import { describe, expect, it } from 'vitest';
import { LOCAL_WORDS } from '../guidelines';
import { CHILD_WORDS } from './child-words';
import { wordRank } from './word-list';

describe('child words', () => {
  it('stays short', () => {
    expect(CHILD_WORDS.size).toBeLessThanOrEqual(300);
  });

  it('keeps every word lowercase with letters only', () => {
    for (const w of CHILD_WORDS) expect(w).toMatch(/^[a-z]+$/);
  });

  it('does not repeat a local word', () => {
    for (const w of CHILD_WORDS) expect(LOCAL_WORDS.has(w), w).toBe(false);
  });

  it('adds words that the first tier would otherwise treat as new', () => {
    const added = [...CHILD_WORDS].filter((w) => (wordRank(w) ?? Infinity) > 500);
    expect(added.length).toBeGreaterThan(CHILD_WORDS.size / 2);
  });
});
