import { Story } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import { TaggedQuestion, TaggedStory, tagQuestions } from './tags';

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

const story = (questions: TaggedQuestion[]) => ({
  title: 'The mango tree',
  text: 'Every morning, Lia checks the tree.',
  level: 1,
  words: 6,
  readingGrade: 1,
  questions,
});

describe('TaggedStory schema', () => {
  it('keeps the tags that the contracts Story schema strips', () => {
    const raw = story([tagged(), tagged(), tagged(), tagged()]);
    const kept = TaggedStory.parse(raw);
    expect(kept.questions[0]).toMatchObject({
      subskill: 'key_detail',
      distractors: [null, 'wrong_detail', 'not_stated', 'unrelated'],
    });
    // The gap this type covers until contracts changes: Story drops the tags.
    expect(Story.parse(raw).questions[0]).not.toHaveProperty('subskill');
  });

  it('refuses a story with an untagged question', () => {
    const untagged: Record<string, unknown> = { ...tagged() };
    delete untagged.subskill;
    delete untagged.distractors;
    const three = [tagged(), tagged(), tagged()];
    expect(TaggedStory.safeParse(story(three)).success).toBe(false);
    expect(
      TaggedStory.safeParse({ ...story(three), questions: [...three, untagged] }).success,
    ).toBe(false);
  });
});

describe('tagQuestions', () => {
  const { subskill, distractors, ...plain } = tagged();

  it('joins checked questions with their tags', () => {
    expect(tagQuestions([plain], [{ subskill, distractors }])).toEqual([tagged()]);
  });

  it('throws on a missing tag or a length mismatch', () => {
    expect(() => tagQuestions([plain], [null])).toThrow(/no tags/);
    expect(() => tagQuestions([plain, plain], [{ subskill, distractors }])).toThrow(/2 questions/);
  });
});
