import { EVIDENCE_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { itemDifficulty, rushedThresholdMs } from './ability';
import { scoreAnswer, toItemEvidence, type AnswerInput } from './answer-evidence';

const base: AnswerInput = {
  answerId: 'a1',
  questionId: 'q1',
  skill: 'literal',
  subskill: 'key_detail',
  type: 'multiple_choice',
  calibratedDifficulty: null,
  correct: true,
  responseMs: 60_000,
  wordsOnScreen: 20,
  accommodations: [],
};

describe('scoreAnswer', () => {
  it('gives a normal answer full weight', () => {
    const s = scoreAnswer(base, 40);
    expect(s.weight).toBe(1);
    expect(s.rushed).toBe(false);
  });

  it('marks an answer faster than the threshold as rushed and weighs it less', () => {
    const s = scoreAnswer({ ...base, responseMs: rushedThresholdMs(20) - 1 }, 40);
    expect(s.rushed).toBe(true);
    expect(s.weight).toBeCloseTo(EVIDENCE_RULE.weight.rushed, 10);
  });

  it('weighs an answer after a supported try less', () => {
    const s = scoreAnswer({ ...base, accommodations: ['supported_try'] }, 40);
    expect(s.supportedTry).toBe(true);
    expect(s.weight).toBeCloseTo(EVIDENCE_RULE.weight.supportedTry, 10);
  });

  it('multiplies both weights when rushed after a supported try', () => {
    const s = scoreAnswer({ ...base, responseMs: 0, accommodations: ['supported_try'] }, 40);
    expect(s.weight).toBeCloseTo(
      EVIDENCE_RULE.weight.rushed * EVIDENCE_RULE.weight.supportedTry,
      10,
    );
  });

  it('records question read-aloud without changing the weight', () => {
    const s = scoreAnswer({ ...base, accommodations: ['question_read_aloud'] }, 40);
    expect(s.questionReadAloud).toBe(true);
    expect(s.weight).toBe(1);
  });

  it('does not treat a missing time as rushed', () => {
    expect(scoreAnswer({ ...base, responseMs: null }, 40).rushed).toBe(false);
  });

  it('uses the calibrated difficulty when there is one', () => {
    expect(scoreAnswer({ ...base, calibratedDifficulty: 0.7 }, 40).difficulty).toBe(0.7);
    expect(scoreAnswer(base, 40).difficulty).toBeCloseTo(itemDifficulty(40, 'key_detail'), 10);
  });

  it('takes the guess rate from the question type', () => {
    expect(scoreAnswer({ ...base, type: 'choose_all' }, 40).guess).toBe(
      EVIDENCE_RULE.guess.choose_all,
    );
    expect(scoreAnswer({ ...base, type: null }, 40).guess).toBe(
      EVIDENCE_RULE.guess.multiple_choice,
    );
  });

  it('turns into item evidence for the posterior', () => {
    const s = scoreAnswer(base, 40);
    expect(toItemEvidence(s)).toEqual({
      difficulty: s.difficulty,
      guess: s.guess,
      correct: true,
      weight: 1,
    });
  });
});
