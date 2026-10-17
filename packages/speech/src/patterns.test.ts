import { describe, expect, it } from 'vitest';
import { ReadingPatterns, type WordResult } from '@basabridge/contracts';
import { alignWords, type HeardWord } from './index';
import { aggregateReadingPatterns, patternConfidence, type TryEvidence } from './patterns';

/** A word read right. */
const right = (expected: string): WordResult => ({
  expected,
  heard: expected,
  outcome: 'correct',
  confidence: 0.95,
  markedMisheard: false,
});

/** A word read wrong. */
const wrong = (expected: string, heard: string, confidence = 0.95): WordResult => ({
  expected,
  heard,
  outcome: 'substitution',
  confidence,
  markedMisheard: false,
});

const omitted = (expected: string): WordResult => ({
  expected,
  heard: null,
  outcome: 'omission',
  confidence: 0,
  markedMisheard: false,
});

const tryOf = (
  tryId: string,
  words: WordResult[],
  pausesAfter?: (number | null)[],
): TryEvidence => ({
  tryId,
  expected: words.map((w) => w.expected ?? ''),
  words,
  pausesAfter,
});

const find = (result: ReadingPatterns, kind: string, key: string) =>
  result.patterns.find((p) => p.kind === kind && p.key === key);

describe('aggregateReadingPatterns', () => {
  it('returns an empty, valid result when there is nothing to count', () => {
    const result = aggregateReadingPatterns([]);
    expect(result).toEqual({ triesAnalysed: 0, unclearWords: 0, patterns: [] });
    expect(ReadingPatterns.parse(result)).toEqual(result);
  });

  it('does not report a pattern from a single slip', () => {
    const result = aggregateReadingPatterns([tryOf('a', [wrong('walked', 'walk'), right('home')])]);
    expect(result.patterns).toEqual([]);
  });

  it('finds dropped endings across tries, with counts and the tries involved', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('walked', 'walk'), right('jumped'), right('to')]),
      tryOf('b', [wrong('played', 'play'), wrong('jumped', 'jump')]),
      tryOf('c', [right('walked'), right('played')]),
    ]);
    const ed = find(result, 'dropped_ending', 'ed');
    expect(ed).toMatchObject({ count: 3, tries: 2, tryIds: ['a', 'b'], opportunities: 6 });
    expect(ed!.examples).toContainEqual({ expected: 'walked', heard: 'walk' });
    expect(ReadingPatterns.parse(result)).toEqual(result);
  });

  it('prefers the longest ending and does not also blame letter patterns', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('running', 'run'), wrong('singing', 'sing')]),
    ]);
    expect(find(result, 'dropped_ending', 'ing')?.count).toBe(2);
    expect(find(result, 'letter_pattern', 'ng')).toBeUndefined();
  });

  it('finds difficulty with a letter pattern and counts only words that lose it', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('thin', 'tin'), right('then'), wrong('with', 'wit')]),
      tryOf('b', [wrong('three', 'tree'), right('this')]),
    ]);
    const th = find(result, 'letter_pattern', 'th');
    expect(th).toMatchObject({ count: 3, tries: 2, opportunities: 5 });
  });

  it('does not blame a pattern the heard word still holds', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('the', 'then'), wrong('this', 'thus')]),
    ]);
    expect(find(result, 'letter_pattern', 'th')).toBeUndefined();
  });

  it('finds repeated substitutions', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('was', 'saw')]),
      tryOf('b', [wrong('was', 'saw'), wrong('was', 'saw')]),
      tryOf('c', [wrong('was', 'is')]),
    ]);
    expect(find(result, 'repeated_substitution', 'was>saw')).toMatchObject({
      count: 3,
      tries: 2,
      opportunities: 3,
    });
    expect(find(result, 'repeated_substitution', 'was>is')).toBeUndefined();
  });

  it('finds missing pauses at full stops and ignores the last word', () => {
    const words = [right('Tom'), right('ran.'), right('He'), right('hid.'), right('Done.')];
    const result = aggregateReadingPatterns([
      tryOf('a', words, [0.0, 0.05, 0.0, 0.5, null]),
      tryOf('b', words, [0.1, 0.1, 0.0, 0.4, 0.0]),
    ]);
    expect(find(result, 'missing_pause', 'full_stop')).toMatchObject({
      count: 2,
      tries: 2,
      opportunities: 4,
    });
  });

  it('skips pauses when there are no timings', () => {
    const words = [right('Tom'), right('ran.'), right('He'), right('hid.')];
    const result = aggregateReadingPatterns([tryOf('a', words), tryOf('b', words)]);
    expect(result.patterns).toEqual([]);
  });

  it('skips omissions and words marked misheard', () => {
    const misheard: WordResult = { ...wrong('walked', 'walk'), markedMisheard: true };
    const result = aggregateReadingPatterns([
      tryOf('a', [omitted('walked'), misheard, omitted('played')]),
      tryOf('b', [omitted('walked'), misheard]),
    ]);
    expect(result.patterns).toEqual([]);
  });

  it('does not count unclear words as errors and lowers confidence instead', () => {
    const clear = [
      tryOf('a', [wrong('walked', 'walk'), wrong('played', 'play')]),
      tryOf('b', [wrong('jumped', 'jump'), wrong('looked', 'look')]),
      tryOf('c', [wrong('asked', 'ask'), wrong('helped', 'help')]),
    ];
    const withClear = aggregateReadingPatterns(clear);
    expect(find(withClear, 'dropped_ending', 'ed')).toMatchObject({ count: 6, confidence: 'high' });

    const unclear = [
      ...clear,
      tryOf('d', [
        wrong('walked', 'walk', 0.2),
        wrong('played', 'play', 0.3),
        wrong('jumped', 'jump', 0.1),
        wrong('looked', 'look', 0.2),
      ]),
    ];
    const result = aggregateReadingPatterns(unclear);
    const ed = find(result, 'dropped_ending', 'ed');
    expect(ed).toMatchObject({ count: 6, unclearWords: 4, confidence: 'medium' });
    expect(ed!.tryIds).not.toContain('d');
    expect(result.unclearWords).toBe(4);
  });

  it('does not report a pattern that only unclear audio supports', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('walked', 'walk', 0.1), wrong('played', 'play', 0.2)]),
    ]);
    expect(result.patterns).toEqual([]);
    expect(result.unclearWords).toBe(2);
  });

  it('orders the strongest pattern first, the same way every time', () => {
    const tries = [
      tryOf('a', [wrong('walked', 'walk'), wrong('was', 'saw')]),
      tryOf('b', [wrong('played', 'play'), wrong('was', 'saw')]),
      tryOf('c', [wrong('jumped', 'jump'), right('was')]),
    ];
    const first = aggregateReadingPatterns(tries);
    expect(first.patterns[0]).toMatchObject({ kind: 'dropped_ending', key: 'ed' });
    expect(
      aggregateReadingPatterns([...tries].reverse())
        .patterns.map((p) => p.key)
        .sort(),
    ).toEqual(first.patterns.map((p) => p.key).sort());
  });

  it('carries words only: no audio, names or timings leak into the output', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('walked', 'walk'), wrong('played', 'play')]),
    ]);
    expect(Object.keys(result).sort()).toEqual(['patterns', 'triesAnalysed', 'unclearWords']);
    for (const p of result.patterns) {
      expect(Object.keys(p).sort()).toEqual([
        'confidence',
        'count',
        'examples',
        'key',
        'kind',
        'opportunities',
        'tries',
        'tryIds',
        'unclearWords',
      ]);
    }
  });
});

describe('patternConfidence', () => {
  it('is low for one try, medium for two, high for steady evidence', () => {
    expect(patternConfidence({ count: 2, tries: 1, opportunities: 3, unclearWords: 0 })).toBe(
      'low',
    );
    expect(patternConfidence({ count: 2, tries: 2, opportunities: 3, unclearWords: 0 })).toBe(
      'medium',
    );
    expect(patternConfidence({ count: 4, tries: 3, opportunities: 6, unclearWords: 0 })).toBe(
      'high',
    );
  });

  it('needs a real rate for high', () => {
    expect(patternConfidence({ count: 4, tries: 3, opportunities: 20, unclearWords: 0 })).toBe(
      'medium',
    );
  });

  it('drops a step when much of the evidence is unclear', () => {
    expect(patternConfidence({ count: 4, tries: 3, opportunities: 6, unclearWords: 4 })).toBe(
      'medium',
    );
    expect(patternConfidence({ count: 2, tries: 1, opportunities: 3, unclearWords: 3 })).toBe(
      'low',
    );
  });
});

describe('with the alignment engine', () => {
  const heardFrom = (text: string, confidence = 0.95): HeardWord[] =>
    text
      .split(' ')
      .map((word, i) => ({ text: word, start: i * 0.5, end: i * 0.5 + 0.4, confidence }));

  const passage = 'Sam walked and played with his thin dog';
  const read = (id: string, said: string, confidence?: number): TryEvidence => ({
    tryId: id,
    expected: passage.split(' '),
    words: alignWords(passage.split(' '), heardFrom(said, confidence)),
  });

  it('finds the same patterns from real aligned tries', () => {
    const result = aggregateReadingPatterns([
      read('a', 'Sam walk and played with his tin dog'),
      read('b', 'Sam walked and play wit his tin dog'),
      read('c', 'Sam walk and play with his thin dog'),
    ]);
    expect(find(result, 'dropped_ending', 'ed')).toMatchObject({ count: 4, tries: 3 });
    expect(find(result, 'letter_pattern', 'th')?.count).toBe(3);
    expect(ReadingPatterns.parse(result)).toEqual(result);
  });

  it('does not turn muffled audio into errors', () => {
    const result = aggregateReadingPatterns([
      read('a', 'Sam walk and play with his tin dog', 0.2),
      read('b', 'Sam walk and play with his tin dog', 0.2),
    ]);
    expect(result.patterns).toEqual([]);
  });
});
