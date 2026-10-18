/**
 * Answer scoring for every question type (docs/PLAN.md section 6.1, BB-44).
 *
 * The server calls these. The browser never decides whether an answer was right. Scoring is
 * all-or-nothing (`SCORING_RULE` in packages/levels), because the guess rates in `EVIDENCE_RULE`
 * assume it. Parts right are reported for feedback only and never reach the ability model.
 *
 * Pure functions only. Never throws: an invalid or missing response is reported as invalid with a
 * reason, and an invalid answer gives no evidence at all (see `answerEvidence`).
 */
import type {
  ChooseAllQuestion,
  OrderEventsQuestion,
  QuestionType,
  StoryQuestion,
} from '@basabridge/contracts';
import { orderEventsGuess, SCORING_RULE } from '@basabridge/levels';
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
  | 'type_mismatch'
  | 'not_an_integer'
  | 'out_of_range'
  | 'duplicate'
  | 'empty'
  | 'not_a_full_order'
  /** Multiple choice takes exactly one option. */
  | 'not_one_choice'
  /** The stored question is broken (for example an answer index with no option). */
  | 'malformed_question';

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

/**
 * The part of a question that scoring needs, without any text. The session store keeps this shape,
 * so the route can score from it without loading the story again.
 */
export type AnswerKey =
  | { type: 'multiple_choice'; options: number; answerIndex: number }
  | { type: 'choose_all'; options: number; answerIndexes: readonly number[] }
  /** Events are stored in the right order and shuffled for display, so answers are event indexes. */
  | { type: 'order_events'; events: number };

export function answerKey(q: ScorableQuestion): AnswerKey {
  if (q.type === 'choose_all') {
    return { type: q.type, options: q.options.length, answerIndexes: q.answerIndexes };
  }
  if (q.type === 'order_events') return { type: q.type, events: q.events.length };
  return { type: 'multiple_choice', options: q.options.length, answerIndex: q.answerIndex };
}

function partsTotalOf(key: AnswerKey): number {
  if (key.type === 'choose_all') return new Set(key.answerIndexes).size;
  if (key.type === 'order_events') return key.events;
  return 1;
}

const invalid = (key: AnswerKey, reason: InvalidReason): AnswerScore => ({
  type: key.type,
  correct: false,
  valid: false,
  reason,
  partsRight: 0,
  partsTotal: partsTotalOf(key),
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

/** A key no answer can match fairly, for example an answer index with no option. */
function keyIsBroken(key: AnswerKey): boolean {
  if (key.type === 'multiple_choice') {
    return !Number.isInteger(key.options) || indexProblem([key.answerIndex], key.options) !== null;
  }
  if (key.type === 'choose_all') {
    return !Number.isInteger(key.options) || indexProblem(key.answerIndexes, key.options) !== null;
  }
  return !Number.isInteger(key.events) || key.events < 2;
}

/**
 * Score the option or event indexes a learner sent against a stored key. This is the one scoring
 * path: the question functions below and the answer route all use it.
 *
 * Multiple choice takes exactly one index. Choose-all is right when the set is exactly the true
 * options. Ordering is right when every event is in its place.
 */
export function scoreChosen(key: AnswerKey, chosen: readonly number[]): AnswerScore {
  if (typeof key !== 'object' || key === null) {
    return invalid({ type: 'multiple_choice', options: 0, answerIndex: 0 }, 'malformed_question');
  }
  if (keyIsBroken(key)) return invalid(key, 'malformed_question');
  const size = key.type === 'order_events' ? key.events : key.options;
  const problem = indexProblem(chosen, size);
  if (problem) return invalid(key, problem);

  if (key.type === 'multiple_choice') {
    if (chosen.length !== 1) return invalid(key, 'not_one_choice');
    return scored(key.type, chosen[0] === key.answerIndex ? 1 : 0, 1);
  }

  if (key.type === 'choose_all') {
    // Feedback parts: true options picked, less any wrong options picked. Options left alone do
    // not count, so picking one wrong option never reads as nearly right.
    const truth = new Set(key.answerIndexes);
    const hits = chosen.filter((i) => truth.has(i)).length;
    const wrongPicks = chosen.length - hits;
    return scored(key.type, Math.max(0, hits - wrongPicks), truth.size);
  }

  if (chosen.length !== key.events) return invalid(key, 'not_a_full_order');
  const inPlace = chosen.filter((event, position) => event === position).length;
  return scored(key.type, inPlace, key.events);
}

export function scoreMultipleChoice(q: StoryQuestion, chosen: number): AnswerScore {
  return scoreChosen(answerKey(q), [chosen]);
}

/** Right when the chosen set is exactly the true options. */
export function scoreChooseAll(q: ChooseAllQuestion, chosen: readonly number[]): AnswerScore {
  return scoreChosen(answerKey(q), chosen);
}

/** Right when every event is in its place. Each position is one part. */
export function scoreOrderEvents(q: OrderEventsQuestion, order: readonly number[]): AnswerScore {
  return scoreChosen(answerKey(q), order);
}

export function scoreAnswer(q: ScorableQuestion, r: AnswerResponse): AnswerScore {
  const key = answerKey(q);
  // A missing or malformed response is data from outside, so it must not throw.
  if (typeof r !== 'object' || r === null || r.type !== key.type) {
    return invalid(key, 'type_mismatch');
  }
  if (r.type === 'multiple_choice') return scoreChosen(key, [r.chosen]);
  if (r.type === 'choose_all') return scoreChosen(key, r.chosen);
  return scoreChosen(key, r.order);
}

/**
 * Turn a scored answer into evidence for the ability model, or null when the answer was invalid.
 * An invalid answer (wrong type, out of range, a broken question) is refused, so it never lowers
 * the estimate. The guess rate comes from the question type; for ordering it follows the number of
 * events, one chance in n factorial (`orderEventsGuess` in packages/levels). Only `correct` is used: parts right never reach the model.
 */
export function answerEvidence(o: {
  question: ScorableQuestion;
  score: AnswerScore;
  storyLevel: number;
  rushed: boolean;
  supportedTry: boolean;
}): ItemEvidence | null {
  if (!o.score.valid) return null;
  const subskill = 'subskill' in o.question ? o.question.subskill : undefined;
  const guess =
    o.question.type === 'order_events'
      ? orderEventsGuess(o.question.events.length)
      : guessFor(o.score.type);
  return {
    difficulty: itemDifficulty(o.storyLevel, subskill),
    guess,
    correct: o.score.correct,
    weight: evidenceWeight({ rushed: o.rushed, supportedTry: o.supportedTry }),
  };
}
