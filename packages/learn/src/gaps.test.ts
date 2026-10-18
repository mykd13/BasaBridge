import type { TryAnalysis, WordResult } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import { gapInputFromStory, gapsFromMisses, trickyWords, type AnsweredQuestion } from './index';

const mc = (
  correct: boolean,
  chosen: number,
  subskill: string | null,
  distractors: unknown = ['opposite', null, 'not_stated', 'unrelated'],
): AnsweredQuestion => ({ correct, chosen, subskill, type: 'multiple_choice', distractors });

const word = (
  expected: string | null,
  outcome: WordResult['outcome'],
  markedMisheard = false,
): WordResult => ({ expected, heard: null, outcome, confidence: 0.9, markedMisheard });

const tryWith = (words: WordResult[], wordsRight: number, wordsTotal: number): TryAnalysis => ({
  completed: true,
  lastWordIndex: wordsTotal - 1,
  wordsTotal,
  wordsRight,
  seconds: 30,
  wordsPerMinute: 60,
  words,
});

describe('trickyWords', () => {
  it('keeps substitutions and omissions once each, cleaned up', () => {
    expect(
      trickyWords([
        word('Patient,', 'substitution'),
        word('sour', 'omission'),
        word('patient', 'omission'),
        word('the', 'correct'),
        word('cat', 'repetition'),
      ]),
    ).toEqual(['patient', 'sour']);
  });

  it('skips words marked misheard and insertions with no expected word', () => {
    expect(trickyWords([word('brave', 'substitution', true), word(null, 'insertion')])).toEqual([]);
  });
});

describe('gapInputFromStory', () => {
  it('takes sub-skill and the chosen distractor from wrong answers only', () => {
    const input = gapInputFromStory({
      answers: [
        mc(false, 0, 'cause_effect'),
        mc(true, 1, 'key_detail'),
        mc(false, 2, 'cause_effect'),
      ],
    });
    expect(input.misses).toEqual([
      { subskill: 'cause_effect', distractor: 'opposite' },
      { subskill: 'cause_effect', distractor: 'not_stated' },
    ]);
    expect(input.flaggedWords).toBeUndefined();
    expect(input.wordsRightShare).toBeUndefined();
  });

  it('copes with untagged, badly tagged and harder-to-guess questions', () => {
    const input = gapInputFromStory({
      answers: [
        mc(false, 0, null, null),
        mc(false, 0, 'not_a_subskill'),
        mc(false, 3, 'main_idea', ['bogus', null, null, null]),
        {
          correct: false,
          chosen: 0,
          subskill: 'sequence',
          type: 'order_events',
          distractors: null,
        },
      ],
    });
    expect(input.misses).toEqual([
      { distractor: null },
      { distractor: 'opposite' },
      { subskill: 'main_idea', distractor: null },
      { subskill: 'sequence', distractor: null },
    ]);
  });

  it('reads tricky words and words-right from the counted try', () => {
    const input = gapInputFromStory({
      answers: [],
      countedTry: tryWith([word('lantern', 'substitution')], 40, 50),
    });
    expect(input.flaggedWords).toEqual(['lantern']);
    expect(input.wordsRightShare).toBe(0.8);
  });

  it('feeds gapsFromMisses end to end', () => {
    const gaps = gapsFromMisses(
      gapInputFromStory({
        answers: [mc(false, 0, 'feelings'), mc(false, 2, 'feelings'), mc(false, 3, 'sequence')],
        countedTry: tryWith([word('lantern', 'omission')], 40, 50),
      }),
    );
    expect(gaps.map((g) => g.subject)).toEqual([
      'feelings',
      'sequence',
      'word_practice',
      'decoding',
    ]);
    expect(gaps[0]?.reasons).toEqual(['opposite', 'not_stated']);
  });
});
