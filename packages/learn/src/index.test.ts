import { describe, expect, it } from 'vitest';
import {
  LEARN_RULES,
  bandFor,
  gapsFromMisses,
  isLearned,
  recommend,
  shouldOfferLearn,
  type Lesson,
} from './index';

const lesson = (
  id: string,
  subject: Lesson['subject'],
  band: Lesson['band'],
  status: Lesson['status'] = 'reviewed',
): Lesson => ({
  id,
  subject,
  band,
  title: { en: id, fil: id },
  goal: { en: 'goal', fil: 'layunin' },
  steps: [{ kind: 'explain', text: { en: 'text', fil: 'teksto' } }],
  status,
});

describe('bandFor', () => {
  it('splits the 100 levels into three bands', () => {
    expect(bandFor(1)).toBe('early');
    expect(bandFor(30)).toBe('early');
    expect(bandFor(31)).toBe('middle');
    expect(bandFor(70)).toBe('middle');
    expect(bandFor(71)).toBe('advanced');
    expect(bandFor(100)).toBe('advanced');
  });
});

describe('gapsFromMisses', () => {
  it('ranks the most missed skill first and collects the kinds of mistake', () => {
    const gaps = gapsFromMisses({
      misses: [
        { subskill: 'cause_effect', distractor: 'not_stated' },
        { subskill: 'key_detail', distractor: 'wrong_detail' },
        { subskill: 'cause_effect', distractor: 'opposite' },
      ],
    });
    expect(gaps[0]).toEqual({
      subject: 'cause_effect',
      misses: 2,
      reasons: ['not_stated', 'opposite'],
    });
    expect(gaps[1]?.subject).toBe('key_detail');
  });

  it('ignores misses without a sub-skill tag', () => {
    expect(gapsFromMisses({ misses: [{}, {}] })).toEqual([]);
  });

  it('adds word practice for flagged words and decoding for low words-right', () => {
    const gaps = gapsFromMisses({
      misses: [],
      flaggedWords: ['patient', 'sour'],
      wordsRightShare: 0.7,
    });
    expect(gaps.map((g) => g.subject).sort()).toEqual(['decoding', 'word_practice']);
    expect(gaps.find((g) => g.subject === 'word_practice')?.misses).toBe(2);
  });

  it('does not add decoding when words right is fine', () => {
    expect(gapsFromMisses({ misses: [], wordsRightShare: 0.95 })).toEqual([]);
  });
});

describe('recommend', () => {
  const lessons = [
    lesson('cause-early', 'cause_effect', 'early'),
    lesson('cause-middle', 'cause_effect', 'middle'),
    lesson('detail-middle', 'key_detail', 'middle'),
    lesson('draft-only', 'sequence', 'early', 'draft'),
  ];

  it('picks the lesson in the learner band', () => {
    const picked = recommend([{ subject: 'cause_effect', misses: 2, reasons: [] }], 50, lessons);
    expect(picked.map((l) => l.id)).toEqual(['cause-middle']);
  });

  it('falls back to the nearest band when there is none for theirs', () => {
    const picked = recommend([{ subject: 'key_detail', misses: 1, reasons: [] }], 10, lessons);
    expect(picked.map((l) => l.id)).toEqual(['detail-middle']);
  });

  it('never shows a draft lesson', () => {
    expect(recommend([{ subject: 'sequence', misses: 3, reasons: [] }], 10, lessons)).toEqual([]);
  });

  it('respects the limit and keeps the order of the gaps', () => {
    const picked = recommend(
      [
        { subject: 'cause_effect', misses: 3, reasons: [] },
        { subject: 'key_detail', misses: 2, reasons: [] },
      ],
      50,
      lessons,
      1,
    );
    expect(picked.map((l) => l.id)).toEqual(['cause-middle']);
  });
});

describe('shouldOfferLearn', () => {
  it('offers a small link after a wrong answer, once per quiz', () => {
    expect(shouldOfferLearn({ wrongAnswers: 1, inlineOffersShown: 0, passed: true }).inline).toBe(
      true,
    );
    expect(shouldOfferLearn({ wrongAnswers: 2, inlineOffersShown: 1, passed: true }).inline).toBe(
      false,
    );
  });

  it('offers a prominent button on the result when not passed or something was missed', () => {
    expect(
      shouldOfferLearn({ wrongAnswers: 3, inlineOffersShown: 1, passed: false }).onResult,
    ).toBe(true);
    expect(shouldOfferLearn({ wrongAnswers: 0, inlineOffersShown: 0, passed: true }).onResult).toBe(
      false,
    );
  });

  it('offers nothing during placement', () => {
    expect(
      shouldOfferLearn({
        wrongAnswers: 4,
        inlineOffersShown: 0,
        passed: false,
        duringPlacement: true,
      }),
    ).toEqual({
      inline: false,
      onResult: false,
    });
  });
});

describe('isLearned', () => {
  it('needs a completed lesson and good results on fresh questions', () => {
    expect(isLearned({ completed: true, recheckCorrect: 2, recheckTotal: 2 })).toBe(true);
    expect(isLearned({ completed: true, recheckCorrect: 1, recheckTotal: 2 })).toBe(false);
    expect(isLearned({ completed: false, recheckCorrect: 2, recheckTotal: 2 })).toBe(false);
    expect(isLearned({ completed: true, recheckCorrect: 1, recheckTotal: 1 })).toBe(false);
  });
});

describe('rules', () => {
  it('keeps practice away from the level', () => {
    expect(LEARN_RULES.practiceChangesLevel).toBe(false);
  });
});
