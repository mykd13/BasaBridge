import { describe, expect, it } from 'vitest';
import { feedbackWrong } from '@/server/student/test-fixtures';
import { accommodationsUsed, letterFor, optionStates } from './question-state';

describe('question state', () => {
  it('marks only the picked option before the server scores it', () => {
    expect(optionStates(4, null, null)).toEqual(['idle', 'idle', 'idle', 'idle']);
    expect(optionStates(4, 2, null)).toEqual(['idle', 'idle', 'selected', 'idle']);
  });

  it('shows the server answer after scoring: right, wrong pick, the rest faded', () => {
    expect(optionStates(4, 1, feedbackWrong)).toEqual(['correct', 'wrong', 'dimmed', 'dimmed']);
  });

  it('shows a right pick as correct with nothing marked wrong', () => {
    const right = { ...feedbackWrong, correct: true, chosenIndex: 0 };
    expect(optionStates(4, 0, right)).toEqual(['correct', 'dimmed', 'dimmed', 'dimmed']);
  });

  it('letters the options from A', () => {
    expect([0, 1, 2, 3].map(letterFor)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('records question read aloud only when it was used', () => {
    expect(accommodationsUsed(true)).toEqual(['question_read_aloud']);
    expect(accommodationsUsed(false)).toEqual([]);
  });
});
