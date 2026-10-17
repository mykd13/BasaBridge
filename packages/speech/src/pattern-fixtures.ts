import type { PatternConfidence, ReadingPatternKind } from '@basabridge/contracts';

/**
 * Hand-built reading sessions for the pattern tests. They are NOT bake-off recordings: they are made
 * up to look like what a provider returns, and each one says which patterns a person would expect.
 * Real recordings go in `recordedFixtures` (fixtures.ts) once BB-22 has them, with their own
 * expected patterns added here or beside them. Words only, no audio.
 */
export const PASSAGE =
  'The boys walked home. They played and jumped. Then they thanked their mother.';

export interface FixtureTry {
  id: string;
  /** What the provider heard. A [word, confidence] pair sets the confidence; the default is clear. */
  heard: (string | [string, number])[];
  /** Seconds of silence after expected words, by expected-word index. */
  pauses?: Record<number, number>;
}

export interface PatternFixture {
  name: string;
  tries: FixtureTry[];
  /** Patterns a person would expect, and no others. */
  expect: {
    kind: ReadingPatternKind;
    key: string;
    count: number;
    tries: number;
    confidence: PatternConfidence;
  }[];
  /** Unclear words a person would expect to see left out of the counts. */
  unclearWords: number;
}

export const patternFixtures: PatternFixture[] = [
  {
    name: 'drops -ed endings and runs through full stops',
    tries: [
      {
        id: 't1',
        heard: 'The boys walk home They play and jump Then they thank their mother'.split(' '),
        pauses: { 3: 0.05, 7: 0.1 },
      },
      {
        id: 't2',
        heard: 'The boys walk home They played and jump Then they thanked their mother'.split(' '),
        pauses: { 3: 0.0, 7: 0.6 },
      },
      {
        id: 't3',
        heard: 'The boys walked home They play and jumped Then they thank their mother'.split(' '),
        pauses: { 3: 0.4, 7: 0.0 },
      },
      {
        id: 't4',
        heard: 'The boys walked home They played and jumped Then they thanked their mother'.split(
          ' ',
        ),
        pauses: { 3: 0.5, 7: 0.45 },
      },
    ],
    expect: [
      { kind: 'dropped_ending', key: 'ed', count: 8, tries: 3, confidence: 'high' },
      { kind: 'missing_pause', key: 'full_stop', count: 4, tries: 3, confidence: 'high' },
    ],
    unclearWords: 0,
  },
  {
    name: 'a steady reader leaves nothing to report',
    tries: [
      {
        id: 't1',
        heard: 'The boys walked home They played and jumped Then they thanked their mother'.split(
          ' ',
        ),
      },
      {
        id: 't2',
        heard: 'The boys walked home They played and jumped Then they thanked their mother'.split(
          ' ',
        ),
      },
    ],
    expect: [],
    unclearWords: 0,
  },
  {
    name: 'a noisy room: unclear words are left out, not counted as errors',
    tries: [
      {
        id: 't1',
        heard: [
          'The',
          'boys',
          ['walk', 0.2],
          'home',
          'They',
          ['play', 0.1],
          'and',
          ['jump', 0.3],
          'Then',
          'they',
          ['thank', 0.2],
          'their',
          'mother',
        ],
      },
      {
        id: 't2',
        heard: [
          'The',
          'boys',
          ['walk', 0.2],
          'home',
          'They',
          ['play', 0.2],
          'and',
          'jumped',
          'Then',
          'they',
          'thanked',
          'their',
          'mother',
        ],
      },
    ],
    // Every dropped ending here is unclear audio, so none is counted and there is no pattern.
    expect: [],
    unclearWords: 6,
  },
];
