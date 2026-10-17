import type { WordCheck } from './check';

/** Where one word is in the practice. Nothing here is a failure state. */
export type Phase = 'ready' | 'recording' | 'checking' | 'praised' | 'retry' | 'unscored';

export interface PracticeState {
  words: string[];
  index: number;
  phase: Phase;
  /** Set once the microphone is blocked or the check is unavailable: listen and repeat, no scoring. */
  unscored: boolean;
}

export type PracticeEvent =
  | { type: 'record' }
  | { type: 'checking' }
  | { type: 'checked'; result: WordCheck }
  | { type: 'mic_blocked' }
  | { type: 'next' };

export function initialState(words: string[]): PracticeState {
  return { words, index: 0, phase: 'ready', unscored: false };
}

export function currentWord(state: PracticeState): string | null {
  return state.words[state.index] ?? null;
}

export function isLastWord(state: PracticeState): boolean {
  return state.index >= state.words.length - 1;
}

export function reduce(state: PracticeState, event: PracticeEvent): PracticeState {
  switch (event.type) {
    case 'record':
      return state.unscored ? state : { ...state, phase: 'recording' };
    case 'checking':
      return { ...state, phase: 'checking' };
    case 'checked':
      if (event.result === 'match') return { ...state, phase: 'praised' };
      if (event.result === 'no_match') return { ...state, phase: 'retry' };
      return { ...state, phase: 'unscored', unscored: true };
    case 'mic_blocked':
      return { ...state, phase: 'unscored', unscored: true };
    case 'next':
      if (isLastWord(state)) return state;
      return { ...state, index: state.index + 1, phase: state.unscored ? 'unscored' : 'ready' };
  }
}
