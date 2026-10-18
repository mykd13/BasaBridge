import type { ChooseAllQuestion, OrderEventsQuestion, StoryQuestion } from '@basabridge/contracts';
import { EVIDENCE_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { itemDifficulty, prior, summarise, updatePosterior } from './ability';
import {
  answerEvidence,
  scoreAnswer,
  scoreChooseAll,
  scoreMultipleChoice,
  scoreOrderEvents,
  type AnswerResponse,
  type ScorableQuestion,
} from './score';

const mc: StoryQuestion = {
  skill: 'literal',
  word: null,
  question: 'Where did the cat sleep?',
  options: ['On the bed', 'In a box', 'Under the car', 'In the tree'],
  answerIndex: 1,
  evidence: 'The cat slept in a box.',
};

const chooseAll: ChooseAllQuestion = {
  type: 'choose_all',
  subskill: 'key_detail',
  question: 'Which things did Ana bring?',
  options: ['A hat', 'A ball', 'A book', 'A kite', 'A cup'],
  answerIndexes: [0, 2],
  evidence: 'Ana brought a hat and a book.',
};

const order: OrderEventsQuestion = {
  type: 'order_events',
  subskill: 'sequence',
  question: 'Put what happened in order.',
  events: ['Ben woke up', 'Ben ate', 'Ben ran to school', 'Ben met Ana'],
  evidence: 'Ben woke up, ate, and ran to school, where he met Ana.',
};

describe('scoreMultipleChoice', () => {
  it('marks the right option correct and others wrong', () => {
    expect(scoreMultipleChoice(mc, 1)).toMatchObject({ correct: true, valid: true, partsRight: 1 });
    expect(scoreMultipleChoice(mc, 0)).toMatchObject({
      correct: false,
      valid: true,
      partsRight: 0,
    });
  });

  it('rejects an option that does not exist', () => {
    expect(scoreMultipleChoice(mc, 4)).toMatchObject({ valid: false, reason: 'out_of_range' });
    expect(scoreMultipleChoice(mc, -1)).toMatchObject({ valid: false, reason: 'out_of_range' });
    expect(scoreMultipleChoice(mc, 1.5)).toMatchObject({ valid: false, reason: 'not_an_integer' });
  });
});

describe('scoreChooseAll', () => {
  it('is correct only for exactly the true options, in any order', () => {
    expect(scoreChooseAll(chooseAll, [0, 2])).toMatchObject({ correct: true, partsRight: 5 });
    expect(scoreChooseAll(chooseAll, [2, 0])).toMatchObject({ correct: true });
  });

  it('gives no credit for a missing or an extra option', () => {
    expect(scoreChooseAll(chooseAll, [0])).toMatchObject({
      correct: false,
      valid: true,
      partsRight: 4,
      partsTotal: 5,
    });
    expect(scoreChooseAll(chooseAll, [0, 2, 3])).toMatchObject({ correct: false, partsRight: 4 });
  });

  it('never rewards picking every option', () => {
    expect(scoreChooseAll(chooseAll, [0, 1, 2, 3, 4])).toMatchObject({
      correct: false,
      partsRight: 2,
    });
  });

  it('rejects empty, repeated, out of range and non-integer picks', () => {
    expect(scoreChooseAll(chooseAll, [])).toMatchObject({ valid: false, reason: 'empty' });
    expect(scoreChooseAll(chooseAll, [0, 0, 2])).toMatchObject({
      valid: false,
      reason: 'duplicate',
    });
    expect(scoreChooseAll(chooseAll, [0, 5])).toMatchObject({
      valid: false,
      reason: 'out_of_range',
    });
    expect(scoreChooseAll(chooseAll, [0, 0.5])).toMatchObject({
      valid: false,
      reason: 'not_an_integer',
    });
  });
});

describe('scoreOrderEvents', () => {
  it('is correct only when every event is in place', () => {
    expect(scoreOrderEvents(order, [0, 1, 2, 3])).toMatchObject({ correct: true, partsRight: 4 });
  });

  it('gives no credit for one swap, but counts places for feedback', () => {
    expect(scoreOrderEvents(order, [0, 2, 1, 3])).toMatchObject({
      correct: false,
      valid: true,
      partsRight: 2,
      partsTotal: 4,
    });
    expect(scoreOrderEvents(order, [3, 2, 1, 0])).toMatchObject({ correct: false, partsRight: 0 });
  });

  it('rejects an order that is not a full list of the events', () => {
    expect(scoreOrderEvents(order, [0, 1, 2])).toMatchObject({
      valid: false,
      reason: 'not_a_full_order',
    });
    expect(scoreOrderEvents(order, [0, 1, 2, 3, 3])).toMatchObject({
      valid: false,
      reason: 'duplicate',
    });
    expect(scoreOrderEvents(order, [0, 1, 1, 3])).toMatchObject({
      valid: false,
      reason: 'duplicate',
    });
    expect(scoreOrderEvents(order, [0, 1, 2, 4])).toMatchObject({
      valid: false,
      reason: 'out_of_range',
    });
    expect(scoreOrderEvents(order, [])).toMatchObject({ valid: false, reason: 'empty' });
  });
});

describe('scoreAnswer', () => {
  it('scores each question type with its own rule', () => {
    expect(scoreAnswer(mc, { type: 'multiple_choice', chosen: 1 }).correct).toBe(true);
    expect(scoreAnswer(chooseAll, { type: 'choose_all', chosen: [0, 2] }).correct).toBe(true);
    expect(scoreAnswer(order, { type: 'order_events', order: [0, 1, 2, 3] }).correct).toBe(true);
  });

  it('reports the question type on every score', () => {
    expect(scoreAnswer(mc, { type: 'multiple_choice', chosen: 0 }).type).toBe('multiple_choice');
    expect(scoreAnswer(chooseAll, { type: 'choose_all', chosen: [1] }).type).toBe('choose_all');
    expect(scoreAnswer(order, { type: 'order_events', order: [1, 0, 2, 3] }).type).toBe(
      'order_events',
    );
  });

  it('rejects a response of the wrong type', () => {
    expect(scoreAnswer(mc, { type: 'choose_all', chosen: [1] })).toMatchObject({
      valid: false,
      reason: 'type_mismatch',
    });
    expect(scoreAnswer(order, { type: 'choose_all', chosen: [0, 1, 2, 3] })).toMatchObject({
      valid: false,
      reason: 'type_mismatch',
      partsTotal: 4,
    });
    expect(scoreAnswer(chooseAll, { type: 'multiple_choice', chosen: 0 })).toMatchObject({
      valid: false,
      reason: 'type_mismatch',
    });
  });

  it('never throws on odd input from a request body', () => {
    const odd = [
      { type: 'multiple_choice', chosen: Number.NaN },
      { type: 'multiple_choice', chosen: Number.MAX_SAFE_INTEGER },
      { type: 'choose_all', chosen: [Number.NaN] },
      { type: 'choose_all', chosen: null },
      { type: 'order_events', order: [-1, 0, 1, 2] },
      { type: 'order_events', order: 'abc' },
    ] as unknown as AnswerResponse[];
    for (const r of odd) {
      for (const q of [mc, chooseAll, order]) {
        const s = scoreAnswer(q, r);
        expect(s.correct).toBe(false);
      }
    }
  });
});

describe('answerEvidence', () => {
  const base = { storyLevel: 40, rushed: false, supportedTry: false };

  it('uses the guess rate in EVIDENCE_RULE for each question type', () => {
    const cases: [ScorableQuestion, AnswerResponse][] = [
      [mc, { type: 'multiple_choice', chosen: 1 }],
      [chooseAll, { type: 'choose_all', chosen: [0, 2] }],
      [order, { type: 'order_events', order: [0, 1, 2, 3] }],
    ];
    for (const [question, response] of cases) {
      const score = scoreAnswer(question, response);
      const e = answerEvidence({ ...base, question, score });
      expect(e.guess).toBe(EVIDENCE_RULE.guess[score.type]);
      expect(e.correct).toBe(true);
    }
  });

  it('uses the sub-skill for difficulty when the question has one', () => {
    const score = scoreAnswer(chooseAll, { type: 'choose_all', chosen: [0, 2] });
    const e = answerEvidence({ ...base, question: chooseAll, score });
    expect(e.difficulty).toBeCloseTo(itemDifficulty(40, 'key_detail'), 10);
  });

  it('moves the estimate up more for a right ordering answer than a right multiple-choice one', () => {
    const start = prior(0, 1);
    const meanAfter = (question: ScorableQuestion, response: AnswerResponse) => {
      const e = answerEvidence({ ...base, question, score: scoreAnswer(question, response) });
      return summarise(updatePosterior(start, { ...e, difficulty: 0 })).mean;
    };
    const fromOrder = meanAfter(order, { type: 'order_events', order: [0, 1, 2, 3] });
    const fromMc = meanAfter(mc, { type: 'multiple_choice', chosen: 1 });
    expect(fromOrder).toBeGreaterThan(fromMc);
  });

  it('treats a nearly right answer exactly like any other wrong answer', () => {
    const near = scoreAnswer(order, { type: 'order_events', order: [0, 1, 3, 2] });
    const far = scoreAnswer(order, { type: 'order_events', order: [3, 2, 1, 0] });
    expect(near.partsRight).toBeGreaterThan(far.partsRight);
    expect(answerEvidence({ ...base, question: order, score: near })).toEqual(
      answerEvidence({ ...base, question: order, score: far }),
    );
  });

  it('weights rushed and supported answers with the shared evidence rule', () => {
    const score = scoreAnswer(mc, { type: 'multiple_choice', chosen: 1 });
    const e = answerEvidence({ ...base, rushed: true, supportedTry: true, question: mc, score });
    expect(e.weight).toBeCloseTo(
      EVIDENCE_RULE.weight.rushed * EVIDENCE_RULE.weight.supportedTry,
      10,
    );
  });
});
