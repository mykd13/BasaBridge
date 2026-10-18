import { describe, expect, it } from 'vitest';
import { checkStory, countWords, readingGrade, splitSentences, syllables } from './checks';

const PASSAGE =
  'Lia and her grandfather have a mango tree. Every morning, Lia checks the tree. The mangoes are still green. One day, the wind blows hard. Three mangoes fall. Lia picks them up, but they are too sour. Grandfather smiles. "We must be patient," he says.';

const q = (over: Record<string, unknown> = {}) => ({
  skill: 'literal',
  word: null,
  question: 'Where does Lia check every morning?',
  options: ['The tree', 'The river', 'The school', 'The market'],
  answerIndex: 0,
  evidence: 'Every morning, Lia checks the tree.',
  ...over,
});

/** n questions with different wording, so the duplicate check stays quiet. */
const many = (n: number) =>
  Array.from({ length: n }, (_, i) => q({ question: `Where does Lia check, question ${i}?` }));

const codes = (r: ReturnType<typeof checkStory>) =>
  (r.ok ? r.dropped : r.failures).map((f) => f.code);

describe('text measures', () => {
  it('counts syllables and words', () => {
    expect(syllables('patient')).toBeGreaterThanOrEqual(2);
    expect(countWords('Lia has a tree.')).toBe(4);
  });

  it('rates simple text as an early grade', () => {
    expect(readingGrade(PASSAGE)).toBeLessThan(4);
  });
});

describe('splitSentences', () => {
  it('splits plain sentences', () => {
    expect(splitSentences('Lia runs. Ben jumps! Who wins?')).toEqual([
      'Lia runs.',
      'Ben jumps!',
      'Who wins?',
    ]);
  });

  it('keeps a quote with its speaker tag', () => {
    expect(splitSentences('"Come here!" said Lia. Ben ran.')).toEqual([
      '"Come here!" said Lia.',
      'Ben ran.',
    ]);
  });

  it('ends a sentence at a closing quote when a new sentence follows', () => {
    expect(splitSentences('Lia said, "Stop." Ben stopped.')).toEqual([
      'Lia said, "Stop."',
      'Ben stopped.',
    ]);
  });

  it('keeps curly quotes and abbreviations together', () => {
    expect(splitSentences('“Wait,” said Mr. Cruz. He waited.')).toEqual([
      '“Wait,” said Mr. Cruz.',
      'He waited.',
    ]);
  });

  it('returns a final sentence with no end mark', () => {
    expect(splitSentences('Lia runs. Ben jumps')).toEqual(['Lia runs.', 'Ben jumps']);
  });
});

describe('checkStory at level 24 (25 to 50 words)', () => {
  it('accepts a good story', () => {
    const r = checkStory(PASSAGE, many(4), 24);
    expect(r.ok).toBe(true);
  });

  it('rejects the wrong length', () => {
    const r = checkStory('Lia has a tree.', many(4), 24);
    expect(r.ok).toBe(false);
  });

  it('drops questions whose evidence is not in the passage', () => {
    const r = checkStory(PASSAGE, [...many(4), q({ evidence: 'Not in the story.' })], 24);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.questions).toHaveLength(4);
  });

  it('rejects when fewer than four valid questions remain', () => {
    const r = checkStory(
      PASSAGE,
      [
        ...many(2),
        q({ question: 'a', evidence: 'Not in the story.' }),
        q({ question: 'b', options: ['a', 'a', 'b', 'c'] }),
      ],
      24,
    );
    expect(r.ok).toBe(false);
  });

  it('needs the vocabulary word to appear in the passage', () => {
    const vocab = q({
      skill: 'vocabulary',
      word: 'patient',
      question: 'What does the word "patient" mean?',
      evidence: '"We must be patient," he says.',
    });
    expect(checkStory(PASSAGE, [vocab, ...many(3)], 24).ok).toBe(true);
    expect(checkStory(PASSAGE, [{ ...vocab, word: 'spaceship' }, ...many(3)], 24).ok).toBe(false);
  });

  it('reports every failure, not just the first', () => {
    const r = checkStory('Lia has a tree.', [q({ evidence: 'Not in the story.' })], 24);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failures.map((f) => f.code)).toEqual([
      'too_short',
      'too_few_questions',
      'evidence_missing',
    ]);
    expect(r.failures.at(-1)?.questionIndex).toBe(0);
  });

  it('keeps the dropped question failures when the story passes', () => {
    const r = checkStory(
      PASSAGE,
      [...many(4), q({ question: 'extra', options: ['a', 'a', 'b', 'c'] })],
      24,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dropped).toEqual([
        expect.objectContaining({ code: 'options_not_distinct', questionIndex: 4 }),
      ]);
    }
  });

  it('flags a long passage', () => {
    const long = Array.from({ length: 60 }, () => 'cat').join(' ');
    expect(codes(checkStory(long, [], 24))).toContain('too_long');
  });

  it('rejects an answer index that is not an option', () => {
    expect(
      codes(checkStory(PASSAGE, [...many(4), q({ question: 'x', answerIndex: 4 })], 24)),
    ).toEqual(['answer_out_of_range']);
    expect(codes(checkStory(PASSAGE, [q({ answerIndex: 1.5 })], 24))).toContain('bad_shape');
  });
});

describe('stricter matching', () => {
  const dropped = (extra: Record<string, unknown>) =>
    codes(checkStory(PASSAGE, [...many(4), q(extra)], 24));

  it('accepts evidence that is a run of adjacent sentences', () => {
    const evidence = 'Every morning, Lia checks the tree. The mangoes are still green.';
    expect(dropped({ question: 'run', evidence })).toEqual([]);
  });

  it('rejects evidence that is only part of a sentence', () => {
    expect(dropped({ question: 'part', evidence: 'Lia checks the tree' })).toEqual([
      'evidence_not_sentence',
    ]);
  });

  it('rejects evidence from two sentences that are not next to each other', () => {
    const evidence = 'Every morning, Lia checks the tree. One day, the wind blows hard.';
    expect(dropped({ question: 'gap', evidence })).toEqual(['evidence_missing']);
  });

  it('ignores quote style and spacing in evidence', () => {
    const evidence = '“We must be   patient,” he says.';
    expect(dropped({ question: 'curly', evidence })).toEqual([]);
  });

  it('matches the vocabulary word on word boundaries', () => {
    const vocab = (word: string) =>
      dropped({
        skill: 'vocabulary',
        word,
        question: `meaning of ${word}`,
        evidence: 'Three mangoes fall.',
      });
    expect(vocab('mango')).toEqual([]);
    expect(vocab('fall')).toEqual([]);
    expect(vocab('man')).toEqual(['vocab_word_missing']);
    expect(vocab('tree')).toEqual([]);
    expect(vocab('tre')).toEqual(['vocab_word_missing']);
  });

  it('allows simple inflections of the vocabulary word', () => {
    const inflect = (passage: string, word: string) =>
      codes(
        checkStory(
          passage,
          [
            ...many(3),
            q({
              skill: 'vocabulary',
              word,
              question: 'vocab',
              evidence: passage.split('. ')[0] + '.',
            }),
          ],
          24,
        ),
      ).includes('vocab_word_missing');
    const base = 'Lia was walking home. ';
    expect(inflect(base + 'x', 'walk')).toBe(false);
    expect(inflect('Lia was baking bread. ' + base, 'bake')).toBe(false);
    expect(inflect('The dog was running fast. ' + base, 'run')).toBe(false);
    expect(inflect('The category was big. ' + base, 'cat')).toBe(true);
  });

  it('rejects a repeated question', () => {
    const r = checkStory(PASSAGE, [...many(4), ...many(1)], 24);
    expect(r.ok && r.dropped.map((f) => f.code)).toEqual(['duplicate_question']);
    const same = checkStory(
      PASSAGE,
      [q(), q({ question: ' WHERE does Lia check every  morning? ' })],
      24,
    );
    expect(!same.ok && same.failures.map((f) => f.code)).toContain('duplicate_question');
  });
});

describe('question tags', () => {
  const tagged = (over: Record<string, unknown> = {}) =>
    q({
      subskill: 'key_detail',
      distractors: [null, 'wrong_detail', 'unrelated', 'not_stated'],
      ...over,
    });
  const four = (first: Record<string, unknown>) => [
    tagged(first),
    ...[0, 1, 2].map((i) => tagged({ question: `Tagged question ${i}?` })),
  ];

  it('keeps the tags in question order', () => {
    const r = checkStory(PASSAGE, four({}), 24, { requireTags: true });
    expect(r.ok && r.tags.map((t) => t?.subskill)).toEqual([
      'key_detail',
      'key_detail',
      'key_detail',
      'key_detail',
    ]);
  });

  it('allows untagged questions unless tags are required', () => {
    const r = checkStory(PASSAGE, many(4), 24);
    expect(r.ok && r.tags).toEqual([null, null, null, null]);
    const untagged = q({ question: 'Untagged?' });
    expect(codes(checkStory(PASSAGE, [...four({}), untagged], 24, { requireTags: true }))).toEqual([
      'missing_tags',
    ]);
  });

  it('checks tags that are present even when not required', () => {
    expect(codes(checkStory(PASSAGE, [...four({}), tagged({ subskill: 'spelling' })], 24))).toEqual(
      ['duplicate_question', 'bad_subskill'],
    );
    expect(
      codes(
        checkStory(PASSAGE, [...four({}), tagged({ question: 'Feel?', subskill: 'feelings' })], 24),
      ),
    ).toEqual(['subskill_mismatch']);
  });

  it('needs exactly one null distractor, at the answer', () => {
    const bad = (distractors: unknown) =>
      codes(
        checkStory(PASSAGE, [...four({}), tagged({ question: 'Tags?', distractors })], 24),
      ).includes('bad_distractors');
    expect(bad([null, null, 'unrelated', 'not_stated'])).toBe(true);
    expect(bad(['wrong_detail', null, 'unrelated', 'not_stated'])).toBe(true);
    expect(bad([null, 'wrong_detail', 'unrelated'])).toBe(true);
    expect(bad([null, 'wrong_detail', 'unrelated', 'made_up'])).toBe(true);
    expect(bad([null, 'wrong_detail', 'unrelated', 'not_stated'])).toBe(false);
  });
});

describe('hard question types', () => {
  const chooseAll = (over: Record<string, unknown> = {}) => ({
    type: 'choose_all',
    subskill: 'key_detail',
    question: 'Which of these are true?',
    options: ['Lia has a mango tree', 'The mangoes are green', 'Lia sells mangoes', 'It snows'],
    answerIndexes: [1, 0],
    evidence: 'The mangoes are still green.',
    ...over,
  });
  const orderEvents = (over: Record<string, unknown> = {}) => ({
    type: 'order_events',
    subskill: 'sequence',
    question: 'Put these in order.',
    events: ['The wind blows hard', 'Three mangoes fall', 'Lia picks them up'],
    evidence: 'One day, the wind blows hard. Three mangoes fall.',
    ...over,
  });

  it('keeps valid choose-all and order-the-events questions', () => {
    const r = checkStory(PASSAGE, [...many(4), chooseAll(), orderEvents()], 24, {
      requireHardQuestion: true,
    });
    expect(r.ok && r.dropped).toEqual([]);
    expect(r.ok && r.hardQuestions.map((h) => h.type)).toEqual(['choose_all', 'order_events']);
    const first = r.ok ? r.hardQuestions[0] : undefined;
    expect(first?.type === 'choose_all' && first.answerIndexes).toEqual([0, 1]);
  });

  it('needs one from the rule level, and allows none below it', () => {
    const opts = { requireHardQuestion: true };
    expect(codes(checkStory(PASSAGE, many(4), 24, opts))).toEqual(['no_hard_question']);
    expect(checkStory(PASSAGE, many(4), 24).ok).toBe(true);
    const tier1 = 'Sam has a red kite. The kite is up high. Sam runs fast.';
    const easy = [0, 1, 2, 3].map((i) =>
      q({ question: `Kite question ${i}?`, evidence: 'Sam runs fast.' }),
    );
    expect(checkStory(tier1, easy, 10, opts).ok).toBe(true);
    expect(
      codes(checkStory(tier1, [...easy, chooseAll({ evidence: 'Sam runs fast.' })], 10)),
    ).toEqual(['type_not_allowed']);
  });

  it('needs a wrong option and distinct answers in choose-all', () => {
    const drop = (over: Record<string, unknown>) =>
      codes(checkStory(PASSAGE, [...many(4), chooseAll(over)], 24));
    expect(drop({ answerIndexes: [0, 1, 2, 3] })).toEqual(['bad_choose_all_answers']);
    expect(drop({ answerIndexes: [1, 1] })).toEqual(['bad_choose_all_answers']);
    expect(drop({ answerIndexes: [4] })).toEqual(['answer_out_of_range']);
    expect(drop({ answerIndexes: [] })).toEqual(['bad_shape']);
    expect(drop({ subskill: 'spelling' })).toEqual(['bad_subskill']);
    expect(drop({ options: ['a', 'A', 'b', 'c'] })).toEqual(['options_not_distinct']);
    expect(drop({ evidence: 'The mangoes are' })).toEqual(['evidence_not_sentence']);
  });

  it('needs distinct events and the sequence sub-skill in order-the-events', () => {
    const drop = (over: Record<string, unknown>) =>
      codes(checkStory(PASSAGE, [...many(4), orderEvents(over)], 24));
    expect(drop({ events: ['Fall', 'fall ', 'Pick'] })).toEqual(['events_not_distinct']);
    expect(drop({ subskill: 'key_detail' })).toEqual(['subskill_mismatch']);
    expect(drop({ events: ['Only', 'two'] })).toEqual(['bad_shape']);
    expect(drop({ evidence: 'Lia flies away.' })).toEqual(['evidence_missing']);
  });

  it('treats an unknown type as a bad shape', () => {
    expect(codes(checkStory(PASSAGE, [...many(4), q({ type: 'essay' })], 24))).toEqual([
      'bad_shape',
    ]);
  });
});
