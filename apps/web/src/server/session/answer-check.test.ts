import { describe, expect, it } from 'vitest';
import { checkAnswer } from './answer-check';

describe('multiple choice', () => {
  const key = { type: 'multiple_choice', options: 4, answerIndex: 2 } as const;

  it('is right only for the key', () => {
    expect(checkAnswer(key, [2])).toEqual({ valid: true, correct: true });
    expect(checkAnswer(key, [0])).toEqual({ valid: true, correct: false });
  });

  it('refuses anything a screen could not send', () => {
    for (const chosen of [[], [4], [-1], [1.5], [1, 2]]) {
      expect(checkAnswer(key, chosen)).toEqual({ valid: false });
    }
  });
});

describe('choose all', () => {
  const key = { type: 'choose_all', options: 5, answerIndexes: [0, 3] } as const;

  it('is right for exactly the right set, in any order', () => {
    expect(checkAnswer(key, [3, 0])).toEqual({ valid: true, correct: true });
    expect(checkAnswer(key, [0])).toEqual({ valid: true, correct: false });
    expect(checkAnswer(key, [0, 3, 4])).toEqual({ valid: true, correct: false });
  });

  it('refuses repeats and indexes past the options', () => {
    expect(checkAnswer(key, [0, 0])).toEqual({ valid: false });
    expect(checkAnswer(key, [5])).toEqual({ valid: false });
  });
});

describe('order the events', () => {
  const key = { type: 'order_events', events: 4 } as const;

  it('is right only for the order they happened', () => {
    expect(checkAnswer(key, [0, 1, 2, 3])).toEqual({ valid: true, correct: true });
    expect(checkAnswer(key, [1, 0, 2, 3])).toEqual({ valid: true, correct: false });
  });

  it('refuses a partial or repeated order', () => {
    expect(checkAnswer(key, [0, 1, 2])).toEqual({ valid: false });
    expect(checkAnswer(key, [0, 1, 1, 2])).toEqual({ valid: false });
  });
});

describe('one scoring path', () => {
  it('refuses a broken key instead of marking every answer wrong', () => {
    const key = { type: 'choose_all', options: 4, answerIndexes: [0, 7] } as const;
    expect(checkAnswer(key, [0])).toEqual({ valid: false });
  });
});
