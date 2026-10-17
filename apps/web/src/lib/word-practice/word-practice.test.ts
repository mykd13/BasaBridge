import { describe, expect, it } from 'vitest';
import type { WordResult } from '@basabridge/contracts';
import { splitIntoChunks } from './chunks';
import { checkWord, parseWordCheck } from './check';
import { getFlaggedWords, pickFlaggedWords } from './flagged';
import { currentWord, initialState, reduce } from './session';

const word = (
  expected: string,
  outcome: WordResult['outcome'],
  extra: Partial<WordResult> = {},
): WordResult => ({
  expected,
  heard: null,
  outcome,
  confidence: 0.9,
  markedMisheard: false,
  ...extra,
});

describe('splitIntoChunks', () => {
  it('splits like the canvas example', () => {
    expect(splitIntoChunks('patient')).toEqual(['pa', 'tient']);
  });
  it('shares two consonants between chunks', () => {
    expect(splitIntoChunks('rabbit')).toEqual(['rab', 'bit']);
  });
  it('keeps one-chunk words whole and ignores a silent final e', () => {
    expect(splitIntoChunks('cat')).toEqual(['cat']);
    expect(splitIntoChunks('cake')).toEqual(['cake']);
  });
  it('joins back to the word and handles empty input', () => {
    expect(splitIntoChunks('Beautiful').join('')).toBe('beautiful');
    expect(splitIntoChunks('  ')).toEqual([]);
  });
});

describe('pickFlaggedWords', () => {
  const t = (iso: string, words: WordResult[]) => ({ at: new Date(iso), words });

  it('lists the most recent try first and each word once', () => {
    const out = pickFlaggedWords([
      t('2026-10-01', [word('old', 'omission'), word('again', 'substitution')]),
      t('2026-10-05', [word('new', 'substitution'), word('Again', 'omission')]),
    ]);
    expect(out).toEqual(['new', 'again', 'old']);
  });
  it('skips correct, misheard, low-value outcomes and insertions', () => {
    const out = pickFlaggedWords([
      t('2026-10-05', [
        word('fine', 'correct'),
        word('heard', 'substitution', { markedMisheard: true }),
        word('extra', 'insertion', { expected: null }),
        word('again', 'repetition'),
        word('kept', 'omission'),
      ]),
    ]);
    expect(out).toEqual(['kept']);
  });
  it('respects the limit', () => {
    const words = ['a', 'b', 'c'].map((w) => word(w, 'omission'));
    expect(pickFlaggedWords([t('2026-10-05', words)], 2)).toEqual(['a', 'b']);
  });
  it('starts empty with no real data', async () => {
    expect(await getFlaggedWords()).toEqual([]);
  });
});

describe('practice session', () => {
  const start = initialState(['patient', 'bridge']);

  it('praises only a clear match', () => {
    expect(reduce(start, { type: 'checked', result: 'match' }).phase).toBe('praised');
  });
  it('offers another go on anything else, never a failure state', () => {
    const s = reduce(start, { type: 'checked', result: 'no_match' });
    expect(s.phase).toBe('retry');
    expect(reduce(s, { type: 'record' }).phase).toBe('recording');
  });
  it('falls back to unscored when the check is unavailable or the mic is blocked', () => {
    for (const e of [
      { type: 'checked', result: 'unavailable' },
      { type: 'mic_blocked' },
    ] as const) {
      const s = reduce(start, e);
      expect(s).toMatchObject({ phase: 'unscored', unscored: true });
      expect(reduce(s, { type: 'record' })).toBe(s);
      expect(reduce(s, { type: 'next' }).phase).toBe('unscored');
    }
  });
  it('moves to the next word and stops at the last', () => {
    const s = reduce(reduce(start, { type: 'checked', result: 'match' }), { type: 'next' });
    expect(currentWord(s)).toBe('bridge');
    expect(s.phase).toBe('ready');
    expect(reduce(s, { type: 'next' })).toBe(s);
  });
});

describe('word check seam', () => {
  it('reports unavailable until the speech pipeline lands, and never throws', async () => {
    expect(await checkWord(new Blob(['x']), 'patient')).toBe('unavailable');
  });
  it('maps unknown values to unavailable', () => {
    expect(parseWordCheck('match')).toBe('match');
    expect(parseWordCheck('no_match')).toBe('no_match');
    expect(parseWordCheck('boom')).toBe('unavailable');
  });
});
