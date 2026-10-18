/**
 * Checks one answer against the question's key on the server (AGENTS.md rules 1 and 5, BB-36).
 * The browser sends only the indexes it picked (`AnswerSubmission.chosen`). Pure.
 *
 * The scoring itself lives in `packages/mastery` (`scoreChosen`, BB-44), so there is one scoring
 * path. This file only turns its result into what the route needs: refused or right or wrong.
 * How much an answer counts (rushed, supported try) is also decided in `packages/mastery`.
 */
import { scoreChosen, type AnswerKey } from '@basabridge/mastery';

/** The key of one question, in the shapes `packages/contracts` defines (ADR 0003). */
export type { AnswerKey };

export type AnswerCheck = { valid: true; correct: boolean } | { valid: false };

/** An invalid answer is one no screen could send: it is refused, never marked wrong. */
export function checkAnswer(key: AnswerKey, chosen: readonly number[]): AnswerCheck {
  const score = scoreChosen(key, chosen);
  return score.valid ? { valid: true, correct: score.correct } : { valid: false };
}
