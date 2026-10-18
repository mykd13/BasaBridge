import { describe, expect, it } from 'vitest';
import { TaggedQuestion } from './tags';

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
