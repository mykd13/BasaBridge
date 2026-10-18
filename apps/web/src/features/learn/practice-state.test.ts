import { describe, expect, it } from 'vitest';
import { practiceReducer, startPractice } from './practice-state';

const miss = (choice: number) =>
  ({ type: 'checked', choice, correct: false, correctText: 'Right one' }) as const;

describe('practice state', () => {
  it('starts with no hint', () => {
    expect(startPractice().hintShown).toBe(false);
  });

  it('shows the hint after a miss and lets the learner try again', () => {
    const after = practiceReducer(startPractice(), miss(1));
    expect(after.hintShown).toBe(true);
    expect(after.outcome).toBe('choosing');
    expect(after.wrong).toEqual([1]);
    expect(after.correctText).toBeNull();
  });

  it('shows the answer after a second miss', () => {
    const after = practiceReducer(practiceReducer(startPractice(), miss(1)), miss(2));
    expect(after.outcome).toBe('revealed');
    expect(after.correctText).toBe('Right one');
  });

  it('marks a right answer and ignores taps after that', () => {
    const right = practiceReducer(startPractice(), {
      type: 'checked',
      choice: 0,
      correct: true,
      correctText: 'Right one',
    });
    expect(right.outcome).toBe('right');
    expect(practiceReducer(right, miss(1))).toBe(right);
  });

  it('moves on with a fresh item', () => {
    const next = practiceReducer(practiceReducer(startPractice(0), miss(1)), { type: 'next' });
    expect(next).toEqual(startPractice(1));
  });
});
