/**
 * Answer scoring for every question type (docs/PLAN.md section 6.1, BB-44).
 *
 * The server calls these. The browser never decides whether an answer was right. Scoring is
 * all-or-nothing (`SCORING_RULE` in packages/levels), because the guess rates in `EVIDENCE_RULE`
 * assume it. Parts right are reported for feedback only and never reach the ability model.
 *
 * Pure functions only. Never throws: an invalid response scores as wrong with a reason.
 */
import type {
  ChooseAllQuestion,
  OrderEventsQuestion,
  QuestionType,
  StoryQuestion,
} from '@basabridge/contracts';
import { SCORING_RULE } from '@basabridge/levels';
import { evidenceWeight, guessFor, itemDifficulty, type ItemEvidence } from './ability';

export type ScorableQuestion =
  (StoryQuestion & { type?: 'multiple_choice' }) | ChooseAllQuestion | OrderEventsQuestion;

/**
 * What the learner answered. For ordering, `order` lists indexes into `events` as stored (the
 * correct order), in the order the learner placed them. The route keeps the display shuffle on the
 * server and maps positions back, so the browser never sees the correct order.
 */
export type AnswerResponse =
  | { type: 'multiple_choice'; chosen: number }
  | { type: 'choose_all'; chosen: number[] }
  | { type: 'order_events'; order: number[] };

export type InvalidReason =
  'type_mismatch' | 'not_an_integer' | 'out_of_range' | 'duplicate' | 'empty' | 'not_a_full_order';

export interface AnswerScore {
  type: QuestionType;
  correct: boolean;
  valid: boolean;
  reason?: InvalidReason;
  /** For feedback only. Never used by the ability model. */
  partsRight: number;
  partsTotal: number;
}

export function questionType(q: ScorableQuestion): QuestionType {
  return q.type ?? 'multiple_choice';
}

const invalid = (type: QuestionType, reason: InvalidReason, partsTotal: number): AnswerScore => ({
  type,
  correct: false,
  valid: false,
  reason,
  partsRight: 0,
  partsTotal,
});

/** Correct only when every part is right, unless the scoring rule allows partial credit. */
function scored(type: QuestionType, partsRight: number, partsTotal: number): AnswerScore {
  const full = partsRight === partsTotal;
  return {
    type,
    correct: SCORING_RULE.partialCredit ? partsRight > 0 : full,
    valid: true,
    partsRight,
    partsTotal,
  };
}

/** Checks a list of indexes into a list of `size` items. Returns a reason when it is unusable. */
function indexProblem(indexes: unknown, size: number): InvalidReason | null {
  if (!Array.isArray(indexes) || indexes.length === 0) return 'empty';
  if (!indexes.every((i) => Number.isInteger(i))) return 'not_an_integer';
  if (!indexes.every((i: number) => i >= 0 && i < size)) return 'out_of_range';
  if (new Set(indexes).size !== indexes.length) return 'duplicate';
  return null;
}

export function scoreMultipleChoice(q: StoryQuestion, chosen: number): AnswerScore {
  const type = 'multiple_choice';
  if (!Number.isInteger(chosen)) return invalid(type, 'not_an_integer', 1);
  if (chosen < 0 || chosen >= q.options.length) return invalid(type, 'out_of_range', 1);
  return scored(type, chosen === q.answerIndex ? 1 : 0, 1);
}

/** Right when the chosen set is exactly the true options. Each option is one part. */
export function scoreChooseAll(q: ChooseAllQuestion, chosen: number[]): AnswerScore {
  const type = 'choose_all';
  const total = q.options.length;
  const problem = indexProblem(chosen, total);
  if (problem) return invalid(type, problem, total);
  const picked = new Set(chosen);
  const truth = new Set(q.answerIndexes);
  let right = 0;
  for (let i = 0; i < total; i++) if (picked.has(i) === truth.has(i)) right++;
  return scored(type, right, total);
}

/** Right when every event is in its place. Each position is one part. */
export function scoreOrderEvents(q: OrderEventsQuestion, order: number[]): AnswerScore {
  const type = 'order_events';
  const total = q.events.length;
  const problem = indexProblem(order, total);
  if (problem) return invalid(type, problem, total);
  if (order.length !== total) return invalid(type, 'not_a_full_order', total);
  const right = order.filter((event, position) => event === position).length;
  return scored(type, right, total);
}

export function scoreAnswer(q: ScorableQuestion, r: AnswerResponse): AnswerScore {
  if (q.type === 'choose_all') {
    return r.type === 'choose_all'
      ? scoreChooseAll(q, r.chosen)
      : invalid(q.type, 'type_mismatch', q.options.length);
  }
  if (q.type === 'order_events') {
    return r.type === 'order_events'
      ? scoreOrderEvents(q, r.order)
      : invalid(q.type, 'type_mismatch', q.events.length);
  }
  return r.type === 'multiple_choice'
    ? scoreMultipleChoice(q, r.chosen)
    : invalid('multiple_choice', 'type_mismatch', 1);
}

/**
 * Turn a scored answer into evidence for the ability model. The guess rate comes from the question
 * type, so a right ordering answer counts for far more than a right multiple-choice answer. Only
 * `correct` is used: parts right never reach the model.
 */
export function answerEvidence(o: {
  question: ScorableQuestion;
  score: AnswerScore;
  storyLevel: number;
  rushed: boolean;
  supportedTry: boolean;
}): ItemEvidence {
  const subskill = 'subskill' in o.question ? o.question.subskill : undefined;
  return {
    difficulty: itemDifficulty(o.storyLevel, subskill),
    guess: guessFor(o.score.type),
    correct: o.score.correct,
    weight: evidenceWeight({ rushed: o.rushed, supportedTry: o.supportedTry }),
  };
}
