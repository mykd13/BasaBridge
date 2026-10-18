/**
 * The state machine for one learner reading one story (docs/PLAN.md section 6, BB-36).
 * Pure: no database and no clock. The store runs these functions inside a transaction, so the
 * server alone decides tries, the counted try and the status (AGENTS.md rule 5).
 *
 * reading  -> the learner reads aloud; each finished recording is one try.
 * answering -> the counted try is fixed and the learner answers with the story hidden.
 * done     -> nothing more happens on this session; the next story is a new session.
 *
 * Tries allowed come from `packages/levels` when the session opens. Nothing here holds a level number.
 */
import { triesFor } from '@basabridge/levels';

export type SessionStatus = 'reading' | 'answering' | 'done';

/** The parts of a stored try the machine needs. Never carries audio. */
export interface TrySummary {
  id: string;
  completed: boolean;
  wordsRight: number;
  wordsTotal: number;
  wordsPerMinute: number;
  createdAt: Date;
}

export interface SessionState {
  id: string;
  learnerId: string;
  storyId: string;
  /** null means unlimited. */
  triesAllowed: number | null;
  triesUsed: number;
  countedTryId: string | null;
  status: SessionStatus;
}

export type SessionErrorCode =
  | 'not_found'
  | 'not_reading'
  | 'not_answering'
  | 'no_tries_left'
  | 'no_completed_try'
  | 'bad_answer'
  | 'already_answered'
  | 'no_learner'
  | 'no_story';

/** A request the session cannot accept in its current state. Nothing is written when it is thrown. */
export class SessionError extends Error {
  constructor(readonly code: SessionErrorCode) {
    super(code);
    this.name = 'SessionError';
  }
}

/** Values for a new session at a level. */
export function sessionValues(
  level: number,
): Pick<SessionState, 'triesAllowed' | 'triesUsed' | 'countedTryId' | 'status'> {
  return { triesAllowed: triesFor(level), triesUsed: 0, countedTryId: null, status: 'reading' };
}

export function triesLeft(s: Pick<SessionState, 'triesAllowed' | 'triesUsed'>): number | null {
  return s.triesAllowed === null ? null : Math.max(0, s.triesAllowed - s.triesUsed);
}

function share(t: TrySummary): number {
  return t.wordsTotal > 0 ? t.wordsRight / t.wordsTotal : 0;
}

/**
 * The try that counts: only tries that reached the end, then the highest share of words right,
 * then the higher words per minute, then the earlier try. null when no try reached the end.
 */
export function bestTry(tries: readonly TrySummary[]): TrySummary | null {
  let best: TrySummary | null = null;
  for (const t of tries) {
    if (!t.completed) continue;
    if (
      !best ||
      share(t) > share(best) ||
      (share(t) === share(best) &&
        (t.wordsPerMinute > best.wordsPerMinute ||
          (t.wordsPerMinute === best.wordsPerMinute && t.createdAt < best.createdAt)))
    ) {
      best = t;
    }
  }
  return best;
}

/**
 * What the learner sees after a try.
 * - `can_answer`: the try reached the end and tries are left; the learner may answer or try again.
 * - `stopped_early`: the try did not reach the end and tries are left.
 * - `answering`: tries ran out; the best try counts and the questions start.
 * - `tries_used_up`: tries ran out and no try reached the end; the session is done without a result.
 */
export type TryOutcome = 'can_answer' | 'stopped_early' | 'answering' | 'tries_used_up';

export interface TryApplied {
  session: SessionState;
  outcome: TryOutcome;
  /** Set when tries ran out and a try was chosen to count. */
  counted: TrySummary | null;
}

/** Add one finished try. `previous` are the tries already on the session, oldest first. */
export function applyTry(
  session: SessionState,
  previous: readonly TrySummary[],
  added: TrySummary,
): TryApplied {
  if (session.status !== 'reading') throw new SessionError('not_reading');
  if (triesLeft(session) === 0) throw new SessionError('no_tries_left');

  const next: SessionState = { ...session, triesUsed: session.triesUsed + 1 };
  if (triesLeft(next) !== 0) {
    return {
      session: next,
      outcome: added.completed ? 'can_answer' : 'stopped_early',
      counted: null,
    };
  }

  const counted = bestTry([...previous, added]);
  if (!counted) {
    return { session: { ...next, status: 'done' }, outcome: 'tries_used_up', counted: null };
  }
  return {
    session: { ...next, status: 'answering', countedTryId: counted.id },
    outcome: 'answering',
    counted,
  };
}

/** The learner chooses to answer before tries run out. The best try so far counts. */
export function startAnswering(session: SessionState, tries: readonly TrySummary[]): SessionState {
  if (session.status !== 'reading') throw new SessionError('not_reading');
  const counted = bestTry(tries);
  if (!counted) throw new SessionError('no_completed_try');
  return { ...session, status: 'answering', countedTryId: counted.id };
}

/** Where a learner lands when they come back after a refresh or a dropped connection. */
export type ResumePoint =
  | {
      step: 'reading';
      triesUsed: number;
      /** null means unlimited. */
      triesLeft: number | null;
      /** True when at least one try reached the end, so the learner may move on to the questions. */
      canAnswer: boolean;
    }
  | { step: 'answering'; nextQuestionId: string; answered: number; total: number }
  | { step: 'done' };

export function resumePoint(
  session: SessionState,
  tries: readonly TrySummary[],
  questionIds: readonly string[],
  answeredIds: readonly string[],
): ResumePoint {
  if (session.status === 'reading') {
    return {
      step: 'reading',
      triesUsed: session.triesUsed,
      triesLeft: triesLeft(session),
      canAnswer: bestTry(tries) !== null,
    };
  }
  if (session.status === 'answering') {
    const answered = new Set(answeredIds);
    const nextQuestionId = questionIds.find((q) => !answered.has(q));
    if (nextQuestionId !== undefined) {
      return {
        step: 'answering',
        nextQuestionId,
        answered: answered.size,
        total: questionIds.length,
      };
    }
  }
  return { step: 'done' };
}
