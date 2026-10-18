/**
 * Checks one answer against the question's key on the server (AGENTS.md rule 5, BB-36).
 * The browser sends only the indexes it picked (`AnswerSubmission.chosen`). Pure.
 *
 * How much an answer counts (rushed, supported try) is not decided here: that is `scoreAnswer`
 * in `packages/mastery` (BB-19), which takes `correct` from this check.
 */

/** The key of one question, in the shapes `packages/contracts` defines (ADR 0003). */
export type AnswerKey =
  | { type: 'multiple_choice'; options: number; answerIndex: number }
  | { type: 'choose_all'; options: number; answerIndexes: readonly number[] }
  /** Events are stored in the right order and shuffled for display, so `chosen` is event indexes. */
  | { type: 'order_events'; events: number };

export type AnswerCheck = { valid: true; correct: boolean } | { valid: false };

function within(chosen: readonly number[], size: number): boolean {
  return (
    chosen.length > 0 &&
    chosen.every((i) => Number.isInteger(i) && i >= 0 && i < size) &&
    new Set(chosen).size === chosen.length
  );
}

/** An invalid answer is one no screen could send: it is refused, never marked wrong. */
export function checkAnswer(key: AnswerKey, chosen: readonly number[]): AnswerCheck {
  switch (key.type) {
    case 'multiple_choice':
      if (chosen.length !== 1 || !within(chosen, key.options)) return { valid: false };
      return { valid: true, correct: chosen[0] === key.answerIndex };
    case 'choose_all': {
      if (!within(chosen, key.options)) return { valid: false };
      const right = new Set(key.answerIndexes);
      return {
        valid: true,
        correct: chosen.length === right.size && chosen.every((i) => right.has(i)),
      };
    }
    case 'order_events':
      if (chosen.length !== key.events || !within(chosen, key.events)) return { valid: false };
      return { valid: true, correct: chosen.every((event, place) => event === place) };
  }
}
