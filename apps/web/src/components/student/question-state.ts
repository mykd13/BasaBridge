import type { Accommodation } from '@basabridge/contracts';
import type { OptionState } from '@basabridge/ui';
import type { AnswerFeedback } from '@/server/student/schemas';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export function letterFor(index: number): string {
  return LETTERS[index] ?? String(index + 1);
}

/**
 * How each option looks. Before the server has scored the answer, only the picked one is marked.
 * After, the server's correct index is shown, the wrong pick is marked, and the rest fade.
 */
export function optionStates(
  count: number,
  chosen: number | null,
  feedback: AnswerFeedback | null,
): OptionState[] {
  return Array.from({ length: count }, (_, index): OptionState => {
    if (!feedback) return index === chosen ? 'selected' : 'idle';
    if (index === feedback.correctIndex) return 'correct';
    if (index === feedback.chosenIndex) return 'wrong';
    return 'dimmed';
  });
}

/** What to record on the answer. Every accommodation the learner used is logged, never hidden. */
export function accommodationsUsed(usedReadAloud: boolean): Accommodation[] {
  return usedReadAloud ? ['question_read_aloud'] : [];
}
