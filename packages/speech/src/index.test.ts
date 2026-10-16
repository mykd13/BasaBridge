import { describe, expect, it } from 'vitest';
import type { WordResult } from '@basabridge/contracts';
import { summariseTry, wordsPerMinute } from './index';

const w = (
  expected: string | null,
  outcome: WordResult['outcome'],
  extra: Partial<WordResult> = {},
): WordResult => ({
  expected,
  heard: outcome === 'omission' ? null : expected,
  outcome,
  confidence: 0.9,
  markedMisheard: false,
  ...extra,
});

describe('wordsPerMinute', () => {
  it('scales words to a minute', () => {
    expect(wordsPerMinute(52, 50)).toBe(62);
  });
  it('is zero with no time', () => {
    expect(wordsPerMinute(10, 0)).toBe(0);
  });
});

describe('summariseTry', () => {
  it('marks a try complete when the last word is reached', () => {
    const t = summariseTry([w('a', 'correct'), w('b', 'substitution'), w('c', 'correct')], 3);
    expect(t.completed).toBe(true);
    expect(t.wordsTotal).toBe(3);
    expect(t.wordsRight).toBe(2);
  });

  it('marks a try incomplete when the end is omitted', () => {
    const t = summariseTry([w('a', 'correct'), w('b', 'correct'), w('c', 'omission')], 2);
    expect(t.completed).toBe(false);
    expect(t.lastWordIndex).toBe(1);
  });

  it('counts a word marked as misheard as right', () => {
    const t = summariseTry(
      [w('a', 'substitution', { markedMisheard: true }), w('b', 'correct')],
      2,
    );
    expect(t.wordsRight).toBe(2);
  });

  it('ignores insertions when counting expected words', () => {
    const t = summariseTry([w('a', 'correct'), w(null, 'insertion'), w('b', 'correct')], 2);
    expect(t.wordsTotal).toBe(2);
  });
});
