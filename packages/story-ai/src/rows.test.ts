import { describe, expect, it } from 'vitest';
import { checkStory } from './index';
import { toQuestionRows } from './rows';

const PASSAGE =
  'Lia and her grandfather have a mango tree. Every morning, Lia checks the tree. The mangoes are still green. One day, the wind blows hard. Three mangoes fall. Lia picks them up, but they are too sour. Grandfather smiles. "We must be patient," he says.';

const raw = [
  {
    skill: 'literal',
    subskill: 'key_detail',
    word: null,
    question: 'Where does Lia check every morning?',
    options: ['The tree', 'The river', 'The school', 'The market'],
    answerIndex: 0,
    distractors: [null, 'not_stated', 'not_stated', 'unrelated'],
    evidence: 'Every morning, Lia checks the tree.',
  },
  {
    skill: 'literal',
    subskill: 'sequence',
    word: null,
    question: 'What happens after the wind blows hard?',
    options: ['Lia goes to school', 'Three mangoes fall', 'The mangoes turn ripe', 'It rains'],
    answerIndex: 1,
    distractors: ['not_stated', null, 'opposite', 'not_stated'],
    evidence: 'Three mangoes fall.',
  },
  {
    skill: 'vocabulary',
    subskill: 'word_in_context',
    word: 'patient',
    question: 'What does the word "patient" mean here?',
    options: ['Able to wait', 'A sick person', 'In a hurry', 'Very hungry'],
    answerIndex: 0,
    distractors: [null, 'word_sense', 'opposite', 'unrelated'],
    evidence: '"We must be patient," he says.',
  },
  {
    skill: 'inferential',
    subskill: 'feelings',
    word: null,
    question: 'How does Lia most likely feel when she tastes the mangoes?',
    options: ['Let down', 'Proud', 'Sleepy', 'Angry at the wind'],
    answerIndex: 0,
    distractors: [null, 'opposite', 'unrelated', 'not_stated'],
    evidence: 'Lia picks them up, but they are too sour.',
  },
];

describe('toQuestionRows', () => {
  it('fills subskill, type and distractors for every new question', () => {
    const r = checkStory(PASSAGE, raw, 24, { requireTags: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rows = toQuestionRows('story-1', r.questions, r.tags);
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.storyId).toBe('story-1');
      expect(row.subskill).toBeTruthy();
      expect(row.type).toBe('multiple_choice');
      expect(row.distractors).toHaveLength(4);
      expect(row.distractors[row.answerIndex]).toBeNull();
    }
    expect(rows[2]).toMatchObject({
      skill: 'vocabulary',
      word: 'patient',
      text: 'What does the word "patient" mean here?',
      subskill: 'word_in_context',
      distractors: [null, 'word_sense', 'opposite', 'unrelated'],
    });
  });

  it('refuses a question without tags', () => {
    const r = checkStory(PASSAGE, raw, 24, { requireTags: true });
    if (!r.ok) throw new Error('expected a passing story');
    expect(() =>
      toQuestionRows(
        'story-1',
        r.questions,
        r.tags.map(() => null),
      ),
    ).toThrow(/no tags/);
  });
});
