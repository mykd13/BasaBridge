import { describe, expect, it } from 'vitest';
import {
  allowedQuotes,
  childHasNumber,
  missingHedge,
  overclaims,
  quotedWords,
  unknownWords,
} from './claims';
import type { PatternFacts } from './types';

describe('missingHedge', () => {
  it('passes a sentence that says it is a possibility', () => {
    expect(missingHedge('You might be mixing up “was” and “saw”.')).toBe(false);
    expect(missingHedge('It seems the endings are tricky.')).toBe(false);
    expect(missingHedge('Your child may sometimes skip a full stop.')).toBe(false);
  });

  it('flags a sentence that states it as a finding', () => {
    expect(missingHedge('You mix up “was” and “saw”.')).toBe(true);
    // "mayor" is not "may".
    expect(missingHedge('You read “mayor” as “major”.')).toBe(true);
  });
});

describe('overclaims', () => {
  it('flags absolute words at any confidence', () => {
    expect(overclaims('You always drop the ending.', 'state')).toEqual(['always']);
    expect(overclaims('You never stop at full stops, every time.', 'state')).toEqual([
      'never',
      'every time',
    ]);
  });

  it('allows "often" for a sure pattern but not for a possibility', () => {
    expect(overclaims('You often drop the ending.', 'state')).toEqual([]);
    expect(overclaims('You might often drop the ending.', 'possible')).toEqual(['often']);
    expect(overclaims('You keep saying “saw”.', 'possible')).toEqual(['keep']);
  });

  it('passes plain wording', () => {
    expect(overclaims('You might be leaving the end off some words.', 'possible')).toEqual([]);
  });
});

describe('childHasNumber', () => {
  it('finds digits and number words', () => {
    expect(childHasNumber('You read 5 words.')).toBe(true);
    expect(childHasNumber('You got three right.')).toBe(true);
    expect(childHasNumber('About half of them.')).toBe(true);
  });

  it('passes a note without numbers', () => {
    expect(childHasNumber('Say the whole word, right to the end.')).toBe(false);
    // Words that only contain a number word are fine.
    expect(childHasNumber('Look often at the tent and the stone.')).toBe(false);
  });
});

describe('quotedWords', () => {
  it('reads curly, straight and single quotes and drops trailing punctuation', () => {
    expect(quotedWords('You said “Run.” for "running" and ‘th’.')).toEqual([
      'run',
      'running',
      'th',
    ]);
  });
});

describe('unknownWords', () => {
  const patterns: PatternFacts[] = [
    {
      kind: 'dropped_ending',
      key: 'ing',
      count: 3,
      opportunities: 6,
      confidence: 'medium',
      examples: [{ expected: 'running', heard: 'run' }],
    },
    {
      kind: 'repeated_substitution',
      key: 'was>saw',
      count: 2,
      opportunities: 4,
      confidence: 'medium',
      examples: [],
    },
    {
      kind: 'letter_pattern',
      key: 'th',
      count: 4,
      opportunities: 8,
      confidence: 'high',
      examples: [{ expected: 'think', heard: 'tink' }],
    },
  ];
  const allowed = allowedQuotes(patterns);

  it('allows example words, endings, letters and substitution words', () => {
    expect(
      unknownWords(
        'You said “run” for “Running”. Say the “-ing”. “th” as in “think”, not “tink”. “was” and “saw”.',
        allowed,
      ),
    ).toEqual([]);
  });

  it('flags words code never gave', () => {
    expect(unknownWords('You said “passion” for “patient”.', allowed)).toEqual([
      'passion',
      'patient',
    ]);
  });
});
