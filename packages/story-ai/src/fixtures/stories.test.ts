import { describe, expect, it } from 'vitest';
import { tierFor } from '@basabridge/levels';
import { checkStory, type CheckFailureCode } from '../checks';
import { BAD_VERSIONS, GOOD_STORIES } from './stories';

const STORY_LEVEL_CODES: CheckFailureCode[] = [
  'too_short',
  'too_long',
  'too_hard',
  'too_many_new_words',
  'too_few_questions',
];

describe('good fixtures', () => {
  it('has one story in each tier', () => {
    const tiers = GOOD_STORIES.map((s) => tierFor(s.level).from);
    expect(new Set(tiers).size).toBe(6);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it.each(GOOD_STORIES.map((s) => [s.name, s] as const))(
    '%s passes every check',
    (_name, story) => {
      const r = checkStory(story.text, story.questions, story.level);
      expect(r.ok && r.dropped).toEqual([]);
      expect(r.ok && r.questions).toHaveLength(story.questions.length);
    },
  );
});

describe('bad fixtures', () => {
  it('covers every failure code exactly once', () => {
    const codes = BAD_VERSIONS.map((b) => b.code).sort();
    expect(codes).toEqual(
      [
        ...STORY_LEVEL_CODES,
        'bad_shape',
        'options_not_distinct',
        'answer_out_of_range',
        'evidence_missing',
        'evidence_not_sentence',
        'vocab_word_missing',
        'duplicate_question',
      ].sort(),
    );
  });

  it.each(BAD_VERSIONS.map((b) => [b.code, b] as const))(
    '%s is caught with only that code',
    (_code, bad) => {
      const { story } = bad;
      const r = checkStory(story.text, story.questions, story.level);
      if (STORY_LEVEL_CODES.includes(bad.code)) {
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
