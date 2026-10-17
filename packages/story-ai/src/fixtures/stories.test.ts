import { describe, expect, it } from 'vitest';
import { tierFor } from '@basabridge/levels';
import { checkStory, type CheckFailureCode } from '../checks';
import { BAD_VERSIONS, GOOD_STORIES, TAGGED_STORY, type StoryFixture } from './stories';

/** Every failure code, marked story-level or not. The type makes a new code fail to compile here. */
const ALL_CODES = {
  too_short: 'story',
  too_long: 'story',
  too_hard: 'story',
  too_few_questions: 'story',
  no_hard_question: 'story',
  bad_shape: 'question',
  options_not_distinct: 'question',
  answer_out_of_range: 'question',
  evidence_missing: 'question',
  evidence_not_sentence: 'question',
  vocab_word_missing: 'question',
  duplicate_question: 'question',
  missing_tags: 'question',
  bad_subskill: 'question',
  subskill_mismatch: 'question',
  bad_distractors: 'question',
  type_not_allowed: 'question',
  bad_choose_all_answers: 'question',
  events_not_distinct: 'question',
} satisfies Record<CheckFailureCode, 'story' | 'question'>;

const check = (story: StoryFixture) =>
  checkStory(story.text, story.questions, story.level, story.options);

describe('good fixtures', () => {
  it('has one story in each tier', () => {
    const tiers = GOOD_STORIES.map((s) => tierFor(s.level).from);
    expect(new Set(tiers).size).toBe(6);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it.each(GOOD_STORIES.map((s) => [s.name, s] as const))(
    '%s passes every check',
    (_name, story) => {
      const r = check(story);
      expect(r.ok && r.dropped).toEqual([]);
      expect(r.ok && r.questions).toHaveLength(story.questions.length);
    },
  );

  it('the tagged story passes with every rule on', () => {
    const r = check(TAGGED_STORY);
    expect(r.ok && r.dropped).toEqual([]);
    expect(r.ok && r.questions).toHaveLength(5);
    expect(r.ok && r.tags.every((t) => t !== null)).toBe(true);
    expect(r.ok && r.hardQuestions.map((h) => h.type)).toEqual(['choose_all', 'order_events']);
  });
});

describe('bad fixtures', () => {
  it('covers every failure code exactly once', () => {
    const codes = BAD_VERSIONS.map((b) => b.code).sort();
    expect(codes).toEqual(Object.keys(ALL_CODES).sort());
  });

  it.each(BAD_VERSIONS.map((b) => [b.code, b] as const))(
    '%s is caught with only that code',
    (_code, bad) => {
      const r = check(bad.story);
      if (ALL_CODES[bad.code] === 'story') {
        expect(r.ok).toBe(false);
        expect(!r.ok && r.failures.map((f) => f.code)).toEqual([bad.code]);
      } else {
        // The story still has four good questions, so it passes. The bad one is dropped with its code.
        expect(r.ok).toBe(true);
        expect(r.ok && r.dropped.map((f) => f.code)).toEqual([bad.code]);
        expect(r.ok && r.dropped[0]?.questionIndex).toBeDefined();
      }
    },
  );
});
