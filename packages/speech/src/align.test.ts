import { describe, expect, it } from 'vitest';
import { recordedFixtures } from './fixtures';
import type { AlignmentFixture } from './fixtures';
import { alignWords, isLowConfidence, LOW_CONFIDENCE_THRESHOLD, summariseTry } from './index';
import type { HeardWord } from './index';

/** Build heard words from "word" or "word:0.3" tokens. Default confidence is 0.9. */
function say(line: string): HeardWord[] {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((token, i) => {
      const at = token.lastIndexOf(':');
      const hasConfidence = at > 0 && /^[\d.]+$/.test(token.slice(at + 1));
      return {
        text: hasConfidence ? token.slice(0, at) : token,
        start: i * 0.5,
        end: i * 0.5 + 0.4,
        confidence: hasConfidence ? Number(token.slice(at + 1)) : 0.9,
      };
    });
}

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);
const run = (expected: string, heard: string) => alignWords(words(expected), say(heard));
const outcomes = (expected: string, heard: string) => run(expected, heard).map((r) => r.outcome);

describe('alignWords outcomes', () => {
  it('marks every word correct when read exactly', () => {
    expect(outcomes('The cat sat down', 'the cat sat down')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('reports a wrong word as one substitution', () => {
    const result = run('The cat sat', 'the dog sat');
    expect(result.map((r) => r.outcome)).toEqual(['correct', 'substitution', 'correct']);
    expect(result[1]).toMatchObject({ expected: 'cat', heard: 'dog' });
  });

  it('reports a missed word as an omission', () => {
    const result = run('The cat sat down', 'the cat down');
    expect(result.map((r) => r.outcome)).toEqual(['correct', 'correct', 'omission', 'correct']);
    expect(result[2]).toMatchObject({ expected: 'sat', heard: null });
  });

  it('reports an extra word as an insertion with no expected word', () => {
    const result = run('The cat sat', 'the big cat sat');
    expect(result.map((r) => r.outcome)).toEqual(['correct', 'insertion', 'correct', 'correct']);
    expect(result[1]).toMatchObject({ expected: null, heard: 'big' });
  });

  it('reports a repeated word as a repetition', () => {
    // Both spoken "cat" words are identical, so either may be the repeat. One is.
    const result = run('The cat sat', 'the cat cat sat');
    expect(result).toHaveLength(4);
    expect(result.filter((r) => r.outcome === 'repetition')).toHaveLength(1);
    expect(result.filter((r) => r.expected !== null).every((r) => r.outcome === 'correct')).toBe(
      true,
    );
  });

  it('reports a repeated phrase as repetitions', () => {
    expect(outcomes('The cat sat on', 'the cat the cat sat on')).toEqual([
      'repetition',
      'repetition',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('reports a failed try followed by the right word as a self-correction', () => {
    const result = run('A big dog ran', 'a bag big dog ran');
    expect(result.map((r) => r.outcome)).toEqual([
      'correct',
      'self_correction',
      'correct',
      'correct',
      'correct',
    ]);
    expect(result[1]).toMatchObject({ expected: null, heard: 'bag' });
    expect(result[2]).toMatchObject({ expected: 'big', heard: 'big', outcome: 'correct' });
  });

  it('treats a stutter fragment as a repetition', () => {
    expect(outcomes('A big dog', 'a b big dog')).toEqual([
      'correct',
      'repetition',
      'correct',
      'correct',
    ]);
  });
});

describe('alignWords normalisation', () => {
  it('ignores case and punctuation', () => {
    expect(outcomes('Hello, world! "Yes."', 'HELLO world yes')).toEqual([
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('matches curly and straight apostrophes', () => {
    expect(outcomes('Don’t go', "don't go")).toEqual(['correct', 'correct']);
  });

  it('matches numerals with their spoken form in either direction', () => {
    expect(outcomes('I have 3 cats', 'i have three cats')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(outcomes('I have three cats', 'i have 3 cats')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('joins spoken parts of a number', () => {
    expect(outcomes('There are 21 pups', 'there are twenty one pups')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(outcomes('There are 21 pups', 'there are twenty-one pups')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('joins a contraction the provider spoke as two words', () => {
    expect(outcomes("I don't know", 'i do not know')).toEqual(['correct', 'correct', 'correct']);
  });

  it('does not join words when the passage has them apart', () => {
    expect(outcomes('I do not know', 'i do not know')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('skips punctuation-only tokens in the passage', () => {
    expect(outcomes('Go - now', 'go now')).toEqual(['correct', 'correct']);
  });
});

describe('alignWords low confidence', () => {
  it('flags a low-confidence mismatch instead of counting an error', () => {
    const result = run('The cat sat', 'the dog:0.3 sat');
    expect(result[1]).toMatchObject({
      expected: 'cat',
      heard: 'dog',
      outcome: 'correct',
      confidence: 0.3,
    });
    expect(isLowConfidence(result[1]!.confidence)).toBe(true);
  });

  it('counts a confident mismatch as an error', () => {
    expect(isLowConfidence(LOW_CONFIDENCE_THRESHOLD)).toBe(false);
    expect(outcomes('The cat sat', 'the dog:0.5 sat')[1]).toBe('substitution');
  });

  it('drops low-confidence extra words such as background speech', () => {
    const result = run('The cat sat', 'the hello:0.2 there:0.3 cat sat');
    expect(result.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct']);
  });

  it('does not lower the right-word count in the try summary', () => {
    const t = summariseTry(run('The cat sat', 'the dog:0.3 sat'), 3);
    expect(t.wordsRight).toBe(3);
  });
});

describe('alignWords edge cases', () => {
  it('handles a stutter on a word', () => {
    expect(outcomes('The big dog', 'the b b big dog')).toEqual([
      'correct',
      'repetition',
      'repetition',
      'correct',
      'correct',
    ]);
  });

  it('reports a skipped line as omissions', () => {
    const result = run('One two three four five six', 'one two six');
    expect(result.map((r) => r.outcome)).toEqual([
      'correct',
      'correct',
      'omission',
      'omission',
      'omission',
      'correct',
    ]);
  });

  it('reports reading ahead as omissions in the skipped words', () => {
    expect(outcomes('We went to the park today', 'we went park today')).toEqual([
      'correct',
      'correct',
      'omission',
      'omission',
      'correct',
      'correct',
    ]);
  });

  it('reports a stop partway as trailing omissions that the summary sees', () => {
    const t = summariseTry(run('One two three four', 'one two'), 2);
    expect(t.completed).toBe(false);
    expect(t.lastWordIndex).toBe(1);
  });

  it('treats confident background speech as insertions', () => {
    expect(outcomes('The cat sat', 'the cat come here sat')).toEqual([
      'correct',
      'correct',
      'insertion',
      'insertion',
      'correct',
    ]);
  });

  it('handles empty input', () => {
    expect(alignWords([], [])).toEqual([]);
    expect(outcomes('a b', '')).toEqual(['omission', 'omission']);
    expect(outcomes('', 'a b')).toEqual(['insertion', 'insertion']);
  });

  it('ignores stray punctuation tokens from the provider', () => {
    expect(outcomes('The cat', 'the . cat ,')).toEqual(['correct', 'correct']);
  });

  it('clamps out-of-range confidence', () => {
    const result = alignWords(['cat'], [{ text: 'cat', start: 0, end: 1, confidence: 1.4 }]);
    expect(result[0]!.confidence).toBe(1);
  });
});

describe('alignWords speed', () => {
  it('aligns a full passage well under a second', () => {
    const vocabulary = words(
      'the cat sat on a mat and looked at the little red bird in the tall green tree by the river',
    );
    const expected = Array.from(
      { length: 600 },
      (_, i) => vocabulary[(i * 7) % vocabulary.length]!,
    );
    const heard: HeardWord[] = expected
      .filter((_, i) => i % 11 !== 0)
      .map((text, i) => ({
        text: i % 13 === 0 ? 'wrong' : text,
        start: i * 0.4,
        end: i * 0.4 + 0.3,
        confidence: 0.9,
      }));
    const started = performance.now();
    const result = alignWords(expected, heard);
    const elapsed = performance.now() - started;
    expect(result.filter((r) => r.expected !== null)).toHaveLength(600);
    expect(elapsed).toBeLessThan(500);
  });
});

describe('fixtures', () => {
  // A whole reading with several kinds of slip, in the same shape recorded fixtures use.
  const handBuilt: AlignmentFixture = {
    name: 'mixed slips',
    expected: 'The little dog ran to the park and sat down.',
    heard: say('the little dog ran park and sat:0.3 dawn'),
    outcomes: [
      'correct',
      'correct',
      'correct',
      'correct',
      'omission',
      'omission',
      'correct',
      'correct',
      'correct',
      'substitution',
    ],
  };
  const fixtures = [handBuilt, ...recordedFixtures];
  it.each(fixtures.map((f) => [f.name, f] as const))('%s', (_name, fixture) => {
    const result = alignWords(words(fixture.expected), fixture.heard);
    expect(result.map((r) => r.outcome)).toEqual(fixture.outcomes);
  });
});
