/**
 * Guided practice state (H4). The browser only shows what the server said: whether a choice was
 * right comes from `checkPractice`. A hint shows after the first miss, and the answer shows after
 * the second, so a learner is never stuck on one item.
 */
export const MISSES_BEFORE_ANSWER = 2;

export interface PracticeState {
  index: number;
  /** Options already tried and wrong, in the item's own order. */
  wrong: number[];
  hintShown: boolean;
  outcome: 'choosing' | 'right' | 'revealed';
  correctText: string | null;
}

export type PracticeAction =
  { type: 'checked'; choice: number; correct: boolean; correctText: string } | { type: 'next' };

export function startPractice(index = 0): PracticeState {
  return { index, wrong: [], hintShown: false, outcome: 'choosing', correctText: null };
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  if (action.type === 'next') return startPractice(state.index + 1);
  if (state.outcome !== 'choosing' || state.wrong.includes(action.choice)) return state;
  if (action.correct) {
    return { ...state, outcome: 'right', correctText: action.correctText };
  }
  const wrong = [...state.wrong, action.choice];
  return {
    ...state,
    wrong,
    hintShown: true,
    outcome: wrong.length >= MISSES_BEFORE_ANSWER ? 'revealed' : 'choosing',
    correctText: wrong.length >= MISSES_BEFORE_ANSWER ? action.correctText : null,
  };
}
