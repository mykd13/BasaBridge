import { describe, expect, it } from 'vitest';
import { vocabularyProfile } from './profile';

describe('vocabularyProfile', () => {
  it('counts common words as known', () => {
    const p = vocabularyProfile('The boy and the girl go to school.', 500);
    expect(p).toEqual({ counted: 8, known: 8, knownShare: 1, newWords: [] });
  });

  it('lists rare words once each, in order of first use', () => {
    const p = vocabularyProfile('The crab saw a puce shell. Puce shells are rare.', 500);
    expect(p.newWords).toEqual(['puce', 'rare']);
  });

  it('treats words above the allowed rank as new', () => {
    const text = 'The tide came in.';
    expect(vocabularyProfile(text, 2809).newWords).toEqual(['tide']);
    expect(vocabularyProfile('They gathered.', 500).newWords).toEqual(['gathered']);
    expect(vocabularyProfile('They gathered.', 2809).newWords).toEqual([]);
  });

  it('counts child words with their endings as known', () => {
    const p = vocabularyProfile(
      'Grandfather smiles. The kites are red. She smiled and jumped.',
      500,
    );
    expect(p.newWords).toEqual([]);
  });

  it('counts local Filipino words as known, including hyphenated ones', () => {
    const p = vocabularyProfile('Lola made adobo and halo-halo at the sari-sari store.', 500);
    expect(p.newWords).toEqual([]);
  });

  it('skips names of people and places', () => {
    const p = vocabularyProfile('Marisol and Teodoro live in San Roque.', 500);
    expect(p.counted).toBe(3);
    expect(p.newWords).toEqual([]);
  });

  it('counts a capitalised word as a word when it also appears in lowercase', () => {
    const p = vocabularyProfile('Scurry, little crab. The crabs scurry.', 2809);
    expect(p.newWords).toEqual(['scurry']);
  });

  it('checks contractions part by part', () => {
    const p = vocabularyProfile("Don't go. It's late.", 500);
    expect(p.newWords).toEqual([]);
  });

  it('gives a share of 1 for an empty passage', () => {
    expect(vocabularyProfile('', 500)).toEqual({
      counted: 0,
      known: 0,
      knownShare: 1,
      newWords: [],
    });
  });
});
