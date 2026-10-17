import { describe, expect, it } from 'vitest';
import type { WordResult } from '@basabridge/contracts';
import { TryAnalysis } from '@basabridge/contracts';
import { alignWords, summariseTry, type HeardWord } from './index';
import { readingSeconds, stoppingPoint, toTryRecord } from './completion';

const w = (expected: string | null, outcome: WordResult['outcome']): WordResult => ({
  expected,
  heard: outcome === 'omission' ? null : expected,
  outcome,
  confidence: 0.9,
  markedMisheard: false,
});

const heard = (text: string, start: number, end: number): HeardWord => ({
  text,
  start,
  end,
  confidence: 0.9,
});

describe('readingSeconds', () => {
  it('runs from the first word start to the last word end', () => {
    expect(readingSeconds([heard('a', 4, 4.5), heard('b', 5, 5.5), heard('c', 6, 7)])).toBe(3);
  });
  it('leaves out silence before and after reading', () => {
    // 20 seconds of silence before the first word, and the recording runs on after the last.
    expect(readingSeconds([heard('a', 20, 20.5), heard('b', 21, 22)])).toBe(2);
  });
  it('keeps pauses between words', () => {
    expect(readingSeconds([heard('a', 0, 0.5), heard('b', 6, 6.5)])).toBe(6.5);
  });
  it('is zero when nothing was heard', () => {
    expect(readingSeconds([])).toBe(0);
  });
});

describe('completion', () => {
  it('is complete when the last word is read, even after a skipped word', () => {
    const t = summariseTry([w('a', 'correct'), w('b', 'omission'), w('c', 'correct')], 3);
    expect(t.completed).toBe(true);
    expect(stoppingPoint(t)).toBeNull();
  });

  it('is not complete when the last word is omitted', () => {
    const t = summariseTry([w('a', 'correct'), w('b', 'correct'), w('c', 'omission')], 2);
    expect(t.completed).toBe(false);
  });

  it('is not complete when nothing was read', () => {
    const t = summariseTry([w('a', 'omission'), w('b', 'omission')], 0);
    expect(t.completed).toBe(false);
    expect(stoppingPoint(t)).toMatchObject({ lastWordIndex: -1, lastWord: null, wordsLeft: 2 });
  });
});

describe('stoppingPoint', () => {
  it('reports the last word reached and the words left', () => {
    const t = summariseTry(
      [w('the', 'correct'), w('cat', 'correct'), w('sat', 'omission'), w('down', 'omission')],
      2,
    );
    expect(stoppingPoint(t)).toEqual({
      lastWordIndex: 1,
      lastWord: 'cat',
      wordsLeft: 2,
      wordsTotal: 4,
    });
  });

  it('ignores insertions when counting position', () => {
    const t = summariseTry(
      [w('the', 'correct'), w(null, 'insertion'), w('cat', 'correct'), w('sat', 'omission')],
      2,
    );
    expect(stoppingPoint(t)).toMatchObject({ lastWord: 'cat', wordsLeft: 1 });
  });
});

describe('toTryRecord', () => {
  it('stores the analysis and the indexed columns, excluding edge silence from the pace', () => {
    const words = alignWords(
      ['the', 'cat', 'sat'],
      [heard('the', 10, 10.5), heard('cat', 11, 11.5), heard('sat', 12, 13)],
    );
    const record = toTryRecord(words, [
      heard('the', 10, 10.5),
      heard('cat', 11, 11.5),
      heard('sat', 12, 13),
    ]);
    expect(record.wordsRight).toBe(3);
    expect(record.analysis.seconds).toBe(3);
    expect(record.wordsPerMinute).toBe(60);
    expect(record.analysis.completed).toBe(true);
    expect(TryAnalysis.safeParse(record.analysis).success).toBe(true);
  });

  it('records a stopped try as incomplete with zero pace when nothing was heard', () => {
    const words = alignWords(['the', 'cat'], []);
    const record = toTryRecord(words, []);
    expect(record.analysis.completed).toBe(false);
    expect(record.wordsRight).toBe(0);
    expect(record.wordsPerMinute).toBe(0);
  });
});
