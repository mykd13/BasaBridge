import { describe, expect, it } from 'vitest';
import { WORD_LIST_SIZE, wordRank } from './word-list';

describe('word list', () => {
  it('has every NGSL 1.2 word', () => {
    expect(WORD_LIST_SIZE).toBe(2809);
  });

  it('ranks the most common words first', () => {
    expect(wordRank('the')).toBe(1);
    expect(wordRank('be')).toBe(2);
  });

  it('gives inflected forms the rank of their word', () => {
    expect(wordRank('went')).toBe(wordRank('go'));
    expect(wordRank('children')).toBe(wordRank('child'));
  });

  it('allows days, months, number words and titles', () => {
    expect(wordRank('monday')).toBe(1);
    expect(wordRank('twelve')).toBe(1);
    expect(wordRank('mr')).toBe(1);
  });

  it('returns null for a word that is not on the list', () => {
    expect(wordRank('scurry')).toBeNull();
    expect(wordRank('')).toBeNull();
  });
});
