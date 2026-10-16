import { describe, expect, it } from 'vitest';
import { checkStory, countWords, readingGrade, syllables } from './checks';

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

describe('text measures', () => {
  it('counts syllables and words', () => {
    expect(syllables('patient')).toBeGreaterThanOrEqual(2);
    expect(countWords('Lia has a tree.')).toBe(4);
  });

  it('rates simple text as an early grade', () => {
    expect(readingGrade(PASSAGE)).toBeLessThan(4);
  });
});

describe('checkStory at level 24 (25 to 50 words)', () => {
  const four = [q(), q(), q(), q()];

  it('accepts a good story', () => {
    const r = checkStory(PASSAGE, four, 24);
    expect(r.ok).toBe(true);
  });

  it('rejects the wrong length', () => {
    const r = checkStory('Lia has a tree.', four, 24);
    expect(r.ok).toBe(false);
  });

  it('drops questions whose evidence is not in the passage', () => {
    const r = checkStory(PASSAGE, [q(), q(), q(), q(), q({ evidence: 'Not in the story.' })], 24);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.questions).toHaveLength(4);
  });

  it('rejects when fewer than four valid questions remain', () => {
    const r = checkStory(
      PASSAGE,
      [q(), q(), q({ evidence: 'Not in the story.' }), q({ options: ['a', 'a', 'b', 'c'] })],
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
    expect(checkStory(PASSAGE, [vocab, q(), q(), q()], 24).ok).toBe(true);
    expect(checkStory(PASSAGE, [{ ...vocab, word: 'spaceship' }, q(), q(), q()], 24).ok).toBe(
      false,
    );
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
    const r = checkStory(PASSAGE, [q(), q(), q(), q(), q({ options: ['a', 'a', 'b', 'c'] })], 24);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.dropped).toEqual([
        expect.objectContaining({ code: 'options_not_distinct', questionIndex: 4 }),
      ]);
  });

  it('flags a long and a hard passage', () => {
    const long = Array.from({ length: 60 }, () => 'cat').join(' ');
    const r = checkStory(long, [], 24);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.map((f) => f.code)).toContain('too_long');
  });

  it('rejects an answer index that is not an option', () => {
    const r = checkStory(PASSAGE, [q(), q(), q(), q(), q({ answerIndex: 4 })], 24);
    expect(r.ok && r.dropped[0]?.code).toBe('answer_out_of_range');
    const bad = checkStory(PASSAGE, [q({ answerIndex: 1.5 })], 24);
    expect(!bad.ok && bad.failures.map((f) => f.code)).toContain('bad_shape');
  });
});
