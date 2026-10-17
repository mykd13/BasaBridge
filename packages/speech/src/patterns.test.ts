import { describe, expect, it } from 'vitest';
import { ReadingPatterns, type WordResult } from '@basabridge/contracts';
import { alignWords, type HeardWord } from './index';
import { aggregateReadingPatterns, patternConfidence, type TryEvidence } from './patterns';
import { PASSAGE, patternFixtures } from './pattern-fixtures';

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
      opportunities: 4,
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

  it('does not report words read right as errors when the aligner joins them', () => {
    const expected = ['We', "don't", 'know', 'Mr.', 'Cruz', "can't", 'go'];
    const said = (text: string): HeardWord[] =>
      text.split(' ').map((w, i) => ({ text: w, start: i, end: i + 0.5, confidence: 0.95 }));
    const tries = ['a', 'b'].map((tryId) => ({
      tryId,
      words: alignWords(expected, said('We do not know Mr Cruz can not go')),
    }));
    expect(tries[0]!.words.every((w) => w.expected === null || w.outcome === 'correct')).toBe(true);
    expect(aggregateReadingPatterns(tries).patterns).toEqual([]);
  });

  it('counts every clear read of a word as a chance for a repeated substitution', () => {
    const words = [wrong('was', 'saw'), ...Array.from({ length: 9 }, () => right('was'))];
    const result = aggregateReadingPatterns([
      tryOf('a', words),
      tryOf('b', [wrong('was', 'saw'), ...Array.from({ length: 9 }, () => right('was'))]),
    ]);
    expect(find(result, 'repeated_substitution', 'was>saw')).toMatchObject({
      count: 2,
      opportunities: 20,
      confidence: 'low',
    });
  });

  it('keeps a rare slip low however many tries it appears in', () => {
    const clean = Array.from({ length: 30 }, () => right('thin'));
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('thin', 'tin'), ...clean]),
      tryOf('b', [wrong('thin', 'tin'), ...clean]),
    ]);
    expect(find(result, 'letter_pattern', 'th')).toMatchObject({ count: 2, confidence: 'low' });
  });

  it('does not treat abbreviations, initials or ellipses as full stops', () => {
    const words = [
      right('Mr.'),
      right('Cruz'),
      right('J.'),
      right('Reyes'),
      right('wait...'),
      right('go'),
    ];
    const pauses = words.map(() => 0);
    const result = aggregateReadingPatterns([tryOf('a', words, pauses), tryOf('b', words, pauses)]);
    expect(find(result, 'missing_pause', 'full_stop')).toBeUndefined();
  });

  it('does not treat words that only end in the same letters as having an ending', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('thing', 'the'), wrong('this', 'thi'), wrong('over', 'ov')]),
      tryOf('b', [wrong('thing', 'the'), wrong('this', 'thi'), wrong('over', 'ov')]),
    ]);
    expect(result.patterns.filter((p) => p.kind === 'dropped_ending')).toEqual([]);
  });

  it('finds a dropped ending where the spelling changes', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('stories', 'story'), wrong('cried', 'cry')]),
      tryOf('b', [wrong('stories', 'story')]),
    ]);
    expect(find(result, 'dropped_ending', 'es')?.count).toBe(2);
    expect(find(result, 'dropped_ending', 'ed')).toBeUndefined();
  });

  it('sees a full stop that is followed by a curly closing quote', () => {
    const words = ['He', 'said,', '“Go.”', 'Tom', 'ran.', 'Sam', 'hid.', 'Done'].map(right);
    const pauses = words.map(() => 0);
    const result = aggregateReadingPatterns([tryOf('a', words, pauses), tryOf('b', words, pauses)]);
    expect(find(result, 'missing_pause', 'full_stop')).toMatchObject({
      count: 6,
      opportunities: 6,
    });
  });

  it('counts "I." as the end of a sentence but not other initials', () => {
    const words = ['It', 'was', 'Ben', 'and', 'I.', 'Then', 'J.', 'Cruz', 'left.', 'Done'].map(
      right,
    );
    const pauses = words.map(() => 0);
    const result = aggregateReadingPatterns([tryOf('a', words, pauses), tryOf('b', words, pauses)]);
    expect(find(result, 'missing_pause', 'full_stop')).toMatchObject({
      count: 4,
      opportunities: 4,
    });
  });

  it('keeps contractions apart from the words they look like', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong("we'll", 'will'), right('well')]),
      tryOf('b', [wrong("we'll", 'will'), right('well')]),
    ]);
    expect(find(result, 'repeated_substitution', "we'll>will")).toMatchObject({
      count: 2,
      opportunities: 2,
      examples: [{ expected: "we'll", heard: 'will' }],
    });
  });

  it('indexes pauses by the aligned words when the aligner drops a token', () => {
    const passage = ['Tom', '-', 'ran.', 'He', 'hid.', 'Done'];
    const heard: HeardWord[] = 'Tom ran He hid Done'
      .split(' ')
      .map((text, i) => ({ text, start: i, end: i + 0.5, confidence: 0.95 }));
    const tryWith = (tryId: string): TryEvidence => ({
      tryId,
      words: alignWords(passage, heard),
      // Aligned words: Tom, ran., He, hid., Done. Both full stops are run through.
      pausesAfter: [0.5, 0.0, 0.5, 0.0, null],
    });
    const result = aggregateReadingPatterns([tryWith('a'), tryWith('b')]);
    expect(find(result, 'missing_pause', 'full_stop')).toMatchObject({
      count: 4,
      opportunities: 4,
    });
  });

  it('treats a low-confidence word that matches as read right, not unclear', () => {
    const mumbled = { ...right('jumped'), confidence: 0.3 };
    const tries = ['a', 'b', 'c'].map((id) =>
      tryOf(id, [wrong('walked', 'walk'), wrong('played', 'play'), mumbled]),
    );
    const result = aggregateReadingPatterns(tries);
    expect(result.unclearWords).toBe(0);
    expect(find(result, 'dropped_ending', 'ed')).toMatchObject({
      count: 6,
      opportunities: 9,
      unclearWords: 0,
      confidence: 'high',
    });
  });

  it('does not blame a letter pattern for a skip or a wild guess', () => {
    const result = aggregateReadingPatterns([
      tryOf('a', [wrong('the', 'a'), wrong('three', 'home')]),
      tryOf('b', [wrong('the', 'a'), wrong('three', 'home')]),
    ]);
    expect(find(result, 'letter_pattern', 'th')).toBeUndefined();
  });

  it('rejects two tries with the same id', () => {
    expect(() =>
      aggregateReadingPatterns([tryOf('a', [right('go')]), tryOf('a', [right('go')])]),
    ).toThrow(/tryId/);
  });

  it('handles a single word, all words omitted and a try with no words', () => {
    expect(aggregateReadingPatterns([tryOf('a', [right('go')])]).patterns).toEqual([]);
    const gone = [omitted('walked'), omitted('home')];
    expect(aggregateReadingPatterns([tryOf('a', gone), tryOf('b', gone)])).toEqual({
      triesAnalysed: 2,
      unclearWords: 0,
      patterns: [],
    });
    expect(aggregateReadingPatterns([tryOf('a', [])])).toEqual({
      triesAnalysed: 1,
      unclearWords: 0,
      patterns: [],
    });
  });

  it('gives the same output whatever order the tries come in', () => {
    const tries = [
      tryOf('c', [wrong('jumped', 'jump'), wrong('was', 'saw')]),
      tryOf('a', [wrong('walked', 'walk'), wrong('was', 'saw')]),
      tryOf('b', [wrong('played', 'play'), wrong('was', 'saw'), wrong('walked', 'walk')]),
    ];
    expect(aggregateReadingPatterns([...tries].reverse())).toEqual(aggregateReadingPatterns(tries));
  });

  it('orders the strongest pattern first, the same way every time', () => {
    const tries = [
      tryOf('a', [wrong('walked', 'walk'), wrong('was', 'saw')]),
      tryOf('b', [wrong('played', 'play'), wrong('was', 'saw')]),
      tryOf('c', [wrong('jumped', 'jump'), right('was')]),
    ];
    const first = aggregateReadingPatterns(tries);
    expect(first.patterns[0]).toMatchObject({ kind: 'dropped_ending', key: 'ed' });
    expect(aggregateReadingPatterns([...tries].reverse()).patterns).toEqual(first.patterns);
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

describe('hand-built reading sessions', () => {
  const expectedWords = PASSAGE.split(' ');

  for (const fixture of patternFixtures) {
    it(fixture.name, () => {
      const tries: TryEvidence[] = fixture.tries.map((t) => {
        const heard: HeardWord[] = t.heard.map((entry, i) => {
          const [text, confidence] = typeof entry === 'string' ? [entry, 0.95] : entry;
          return { text, start: i * 0.5, end: i * 0.5 + 0.4, confidence };
        });
        const pauses = t.pauses;
        return {
          tryId: t.id,
          words: alignWords(expectedWords, heard),
          pausesAfter: pauses ? expectedWords.map((_, i) => pauses[i] ?? null) : undefined,
        };
      });
      const result = aggregateReadingPatterns(tries);
      expect(
        result.patterns.map((p) => ({
          kind: p.kind,
          key: p.key,
          count: p.count,
          tries: p.tries,
          confidence: p.confidence,
        })),
      ).toEqual(fixture.expect);
      expect(result.unclearWords).toBe(fixture.unclearWords);
      expect(ReadingPatterns.parse(result)).toEqual(result);
    });
  }
});
