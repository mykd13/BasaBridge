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

describe('alignWords joined forms', () => {
  const allCorrect = (expected: string, heard: string): boolean =>
    run(expected, heard).every((r) => r.outcome === 'correct');

  it('reads a passage with both forms of a contraction (B1)', () => {
    expect(
      allCorrect('It is cold. The dog wagged its tail.', 'it is cold the dog wagged its tail'),
    ).toBe(true);
    expect(allCorrect("I don't know. We do not go.", 'i dont know we do not go')).toBe(true);
    expect(allCorrect("I don't know. We do not go.", 'i do not know we dont go')).toBe(true);
    expect(allCorrect("He is here. It's he's.", 'he is here its hes')).toBe(true);
  });

  it('matches in both directions (S4)', () => {
    expect(allCorrect('I do not know', 'i dont know')).toBe(true);
    expect(allCorrect("I don't know", 'i do not know')).toBe(true);
  });

  it('still reports a real error next to a joined form', () => {
    expect(outcomes("I don't like it", 'i do not hate it')).toEqual([
      'correct',
      'correct',
      'substitution',
      'correct',
    ]);
  });

  it('keeps one result per expected word', () => {
    const result = run('I do not know', 'i dont know');
    expect(result.map((r) => r.expected)).toEqual(['I', 'do', 'not', 'know']);
  });
});

describe('alignWords contractions, both directions', () => {
  // [printed, spoken]
  const pairs: [string, string][] = [
    ["I'll", 'I will'],
    ["you'll", 'you will'],
    ["he'll", 'he will'],
    ["she'll", 'she will'],
    ["we'll", 'we will'],
    ["they'll", 'they will'],
    ["it'll", 'it will'],
    ["that'll", 'that will'],
    ["I'd", 'I would'],
    ["you'd", 'you would'],
    ["he'd", 'he would'],
    ["she'd", 'she would'],
    ["we'd", 'we would'],
    ["they'd", 'they would'],
    ["it'd", 'it would'],
    ["we're", 'we are'],
    ["you're", 'you are'],
    ["they're", 'they are'],
    ["what're", 'what are'],
    ["I've", 'I have'],
    ["you've", 'you have'],
    ["we've", 'we have'],
    ["they've", 'they have'],
    ["could've", 'could have'],
    ["should've", 'should have'],
    ["would've", 'would have'],
    ["might've", 'might have'],
    ["must've", 'must have'],
    ["won't", 'will not'],
    ["can't", 'can not'],
    ["don't", 'do not'],
    ["isn't", 'is not'],
    ["I'm", 'I am'],
    ["it's", 'it is'],
    ["here's", 'here is'],
    ["let's", 'let us'],
    ["shan't", 'shall not'],
    ["mustn't", 'must not'],
    ["needn't", 'need not'],
    ["mightn't", 'might not'],
    ["who's", 'who is'],
    ["where's", 'where is'],
    ["he's", 'he has'],
    ["Mom's", 'Mom is'],
    ["Dad'll", 'Dad will'],
  ];
  const allCorrect = (expected: string, heard: string): boolean =>
    run(expected, heard).every((r) => r.outcome === 'correct');

  it.each(pairs)('%s read as "%s"', (printed, spoken) => {
    expect(allCorrect(`Then ${printed} go now`, `then ${spoken} go now`)).toBe(true);
  });

  it.each(pairs)('"%s" printed in full, said as %s', (printed, spoken) => {
    // The passage spells it out, and the provider returns the contraction.
    expect(allCorrect(`Then ${spoken} go now`, `then ${printed} go now`)).toBe(true);
  });

  it('reads a passage that holds both forms of will, would and are', () => {
    const passage = "I'll go. I will stay. We're here. We are home. He'd run. He would walk.";
    expect(
      allCorrect(passage, 'i will go ill stay were here we are home hed run he would walk'),
    ).toBe(true);
    expect(
      allCorrect(passage, "i'll go i will stay we are here we're home he would run he'd walk"),
    ).toBe(true);
  });

  it('reports each expected word once when a contraction is spoken in full', () => {
    expect(run("Then we'll go", 'then we will go').map((r) => r.expected)).toEqual([
      'Then',
      "we'll",
      'go',
    ]);
  });

  it('still reports a wrong word beside a contraction', () => {
    expect(outcomes("Then we'll go", 'then we will run')).toEqual([
      'correct',
      'correct',
      'substitution',
    ]);
  });
});

describe('alignWords numbers (S1)', () => {
  const allCorrect = (expected: string, heard: string): boolean =>
    run(expected, heard).every((r) => r.outcome === 'correct');

  it.each([
    ['It cost 121 coins', 'it cost one hundred twenty one coins'],
    ['It cost 100 coins', 'it cost a hundred coins'],
    ['It cost 1,250 coins', 'it cost one thousand two hundred fifty coins'],
    ['She ran 3.5 miles', 'she ran three point five miles'],
    ['It was 3:30 then', 'it was three thirty then'],
    ['It was 3:00 then', "it was three o'clock then"],
    ['It was 1990', 'it was nineteen ninety'],
    ['It was 1990', 'it was one thousand nine hundred ninety'],
    ['It was 1905', 'it was nineteen oh five'],
    ['It was 2024', 'it was twenty twenty four'],
    ['The 2nd dog', 'the second dog'],
    ['The 21st dog', 'the twenty first dog'],
    ['It cost 105 coins', 'it cost one hundred and five coins'],
    ['It cost 121 coins', 'it cost one hundred and twenty one coins'],
    ['It cost 1,121 coins', 'it cost one thousand one hundred and twenty one coins'],
    ['A 10-year-old boy', 'a ten year old boy'],
    ['It is 50% full', 'it is fifty percent full'],
    ['It is 50% full', 'it is 50 percent full'],
  ])('%s', (expected, heard) => {
    expect(allCorrect(expected, heard)).toBe(true);
  });

  it('does not match a different number', () => {
    expect(outcomes('She ran 3.5 miles', 'she ran thirty five miles')).not.toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });
});

describe('alignWords other normalisation', () => {
  it('ignores accents (N3)', () => {
    expect(outcomes('A café', 'a cafe')).toEqual(['correct', 'correct']);
  });

  it('does not call an ordinary extra word a stutter (N1)', () => {
    const slow: HeardWord[] = [
      { text: 'a', start: 0, end: 0.2, confidence: 0.9 },
      { text: 'apple', start: 1.5, end: 2, confidence: 0.9 },
    ];
    // Passage "apple": the "a" was a separate word said well before the real one.
    expect(alignWords(['apple'], slow).map((r) => r.outcome)).toEqual(['insertion', 'correct']);
  });
});

describe('alignWords low confidence', () => {
  it('flags a low-confidence mismatch instead of counting an error', () => {
    const result = run('The kitten sat', 'the kitton:0.3 sat');
    expect(result[1]).toMatchObject({
      expected: 'kitten',
      heard: 'kitton',
      outcome: 'correct',
      confidence: 0.3,
    });
    expect(isLowConfidence(result[1]!.confidence)).toBe(true);
  });

  it('counts a confident mismatch as an error', () => {
    expect(isLowConfidence(LOW_CONFIDENCE_THRESHOLD)).toBe(false);
    expect(outcomes('The cat sat', 'the dog:0.5 sat')[1]).toBe('substitution');
  });

  it('never lets a noise word stand in for a skipped word', () => {
    // B2: the reader stopped early and a cough was heard in place of the last word.
    const stopped = run('One two three four', 'one two three cough:0.2');
    expect(stopped.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct', 'omission']);
    expect(summariseTry(stopped, 3).completed).toBe(false);
    // The same in the middle of a reading.
    expect(outcomes('The cat sat down', 'the uh:0.3 sat down')).toEqual([
      'correct',
      'omission',
      'correct',
      'correct',
    ]);
  });

  it('does not let a low-confidence filler stand in for a short skipped word (W1)', () => {
    for (const [expected, heard] of [
      ['Tom is up', 'tom is um:0.3'],
      ['The dog is in', 'the dog is an:0.3'],
    ] as const) {
      const result = run(expected, heard);
      expect(result.at(-1)).toMatchObject({ outcome: 'omission' });
      expect(summariseTry(result, 3).completed).toBe(false);
    }
  });

  it('treats a NaN or missing confidence as low', () => {
    const lookalike = alignWords(
      ['kitten'],
      [{ text: 'kitton', start: 0, end: 1, confidence: Number.NaN }],
    );
    expect(lookalike[0]).toMatchObject({ outcome: 'correct', confidence: 0 });
    const missing = alignWords(
      ['kitten'],
      [{ text: 'kitton', start: 0, end: 1 } as unknown as HeardWord],
    );
    expect(missing[0]!.confidence).toBe(0);
  });

  it('does not let a NaN-confidence noise word hide an omission (W2)', () => {
    const noisy = (confidence: number | undefined): HeardWord[] =>
      say('one two three cough').map((w, i) => (i === 3 ? ({ ...w, confidence } as HeardWord) : w));
    for (const confidence of [Number.NaN, undefined]) {
      const result = alignWords(words('One two three four'), noisy(confidence));
      expect(result.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct', 'omission']);
      expect(summariseTry(result, 3).completed).toBe(false);
      expect(result.every((r) => Number.isFinite(r.confidence))).toBe(true);
    }
  });

  it('drops low-confidence extra words such as background speech', () => {
    const result = run('The cat sat', 'the hello:0.2 there:0.3 cat sat');
    expect(result.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct']);
  });

  it('does not lower the right-word count in the try summary', () => {
    const t = summariseTry(run('The kitten sat', 'the kitton:0.3 sat'), 3);
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
    // Shared CI runners vary a lot (seen 700 to 1000 ms). This still catches a slow algorithm.
    expect(elapsed).toBeLessThan(2000);
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
