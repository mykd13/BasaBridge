import { describe, expect, it } from 'vitest';
import { TaggedQuestion, tagProblem } from './tags';

const tagged = (over: Record<string, unknown> = {}): TaggedQuestion =>
  TaggedQuestion.parse({
    skill: 'literal',
    subskill: 'key_detail',
    word: null,
    question: 'Where does Lia check every morning?',
    options: ['The tree', 'The river', 'The school', 'The market'],
    answerIndex: 0,
    distractors: [null, 'wrong_detail', 'not_stated', 'unrelated'],
    evidence: 'Every morning, Lia checks the tree.',
    ...over,
  });

describe('TaggedQuestion schema', () => {
  it('needs a sub-skill from the nine values', () => {
    expect(() => tagged({ subskill: 'guessing' })).toThrow();
    expect(() => tagged({ subskill: undefined })).toThrow();
  });

  it('needs one distractor entry per option, from the six types', () => {
    expect(() => tagged({ distractors: [null, 'opposite', 'unrelated'] })).toThrow();
    expect(() => tagged({ distractors: [null, 'silly', 'unrelated', 'opposite'] })).toThrow();
  });
});

describe('tagProblem', () => {
  it('accepts tags that agree with the question', () => {
    expect(tagProblem(tagged())).toBeNull();
  });

  it('rejects a sub-skill from another skill', () => {
    expect(tagProblem(tagged({ subskill: 'feelings' }))).toMatch(/does not belong/);
  });

  it('rejects a distractor type on the correct option', () => {
    expect(
      tagProblem(tagged({ distractors: ['opposite', 'wrong_detail', 'not_stated', 'unrelated'] })),
    ).toMatch(/correct option/);
  });

  it('rejects a wrong option without a distractor type', () => {
    expect(tagProblem(tagged({ distractors: [null, null, 'not_stated', 'unrelated'] }))).toMatch(
      /Wrong option 1/,
    );
  });

  it('rejects a vocabulary question without a word', () => {
    const vocab = { skill: 'vocabulary', subskill: 'word_in_context' };
    expect(tagProblem(tagged({ ...vocab, word: null }))).toMatch(/needs a word/);
    expect(tagProblem(tagged({ ...vocab, word: 'patient' }))).toMatch(/name its word/);
    expect(
      tagProblem(tagged({ ...vocab, word: 'patient', question: 'What does "patient" mean?' })),
    ).toBeNull();
  });
});
