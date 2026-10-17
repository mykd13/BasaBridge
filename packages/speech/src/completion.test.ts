import { describe, expect, it } from 'vitest';
import type { WordResult } from '@basabridge/contracts';
import { TryAnalysis } from '@basabridge/contracts';
import { summariseTry, type HeardWord } from './index';
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
  it('runs from the first read word start to the last read word end', () => {
    expect(
      readingSeconds([
        { start: 4, end: 4.5 },
        { start: 5, end: 5.5 },
        { start: 6, end: 7 },
      ]),
    ).toBe(3);
  });
  it('keeps pauses between words', () => {
    expect(readingSeconds([{ start: 0, end: 0.5 }, null, { start: 6, end: 6.5 }])).toBe(6.5);
  });
  it('is zero when nothing was read, or the end is before the start', () => {
    expect(readingSeconds([])).toBe(0);
    expect(readingSeconds([null])).toBe(0);
    expect(readingSeconds([{ start: 5, end: 4 }])).toBe(0);
  });
  it('ignores times that are not finite numbers', () => {
    expect(
      readingSeconds([
        { start: Number.NaN, end: 1 },
        { start: 2, end: 3 },
      ]),
    ).toBe(1);
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

  it('counts a last word marked misheard as reached', () => {
    const last = { ...w('c', 'omission'), markedMisheard: true };
    const t = summariseTry([w('a', 'correct'), w('b', 'correct'), last], 3);
    expect(t.completed).toBe(true);
    expect(t.wordsRight).toBe(3);
    expect(stoppingPoint(t)).toBeNull();
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

const sentence = ['the', 'cat', 'sat'];
const read = [heard('the', 20, 20.5), heard('cat', 21, 21.5), heard('sat', 22, 23)];

describe('toTryRecord', () => {
  it('stores the analysis and the table values, excluding edge silence from the pace', () => {
    const record = toTryRecord(sentence, read);
    expect(record.wordsRight).toBe(3);
    expect(record.analysis.seconds).toBe(3);
    expect(record.wordsPerMinute).toBe(60);
    expect(record.completed).toBe(true);
    expect(record.wordsTotal).toBe(3);
    expect(TryAnalysis.safeParse(record.analysis).success).toBe(true);
  });

  it('does not count a low-confidence noise word before reading starts', () => {
    const noise = { ...heard('uh', 0.5, 0.7), confidence: 0.2 };
    const record = toTryRecord(sentence, [noise, ...read]);
    expect(record.analysis.seconds).toBe(3);
    expect(record.wordsPerMinute).toBe(60);
  });

  it('does not count off-passage chatter before reading starts', () => {
    const chatter = [heard('okay', 0, 0.5), heard('ready', 1, 1.5)];
    const record = toTryRecord(sentence, [...chatter, ...read]);
    expect(record.analysis.seconds).toBe(3);
    expect(record.wordsPerMinute).toBe(60);
  });

  it('does not count chatter after the last word', () => {
    const record = toTryRecord(sentence, [...read, heard('done', 40, 41)]);
    expect(record.analysis.seconds).toBe(3);
  });

  it('gives a pace for a partial read and reports it incomplete', () => {
    const record = toTryRecord(sentence, read.slice(0, 2));
    expect(record.completed).toBe(false);
    expect(record.wordsRight).toBe(2);
    expect(record.analysis.seconds).toBe(1.5);
    expect(record.wordsPerMinute).toBe(80);
  });

  it('is incomplete with zero pace when nothing was heard', () => {
    const record = toTryRecord(['the', 'cat'], []);
    expect(record.completed).toBe(false);
    expect(record.wordsRight).toBe(0);
    expect(record.wordsPerMinute).toBe(0);
  });

  it('counts a wrong word at the end as reached but not right', () => {
    const record = toTryRecord(sentence, [read[0]!, read[1]!, heard('sit', 22, 23)]);
    expect(record.completed).toBe(true);
    expect(record.wordsRight).toBe(2);
  });

  it('ignores a time that is not a finite number', () => {
    const record = toTryRecord(sentence, [{ ...read[0]!, start: Number.NaN }, read[1]!, read[2]!]);
    expect(record.analysis.seconds).toBe(2);
  });
});
