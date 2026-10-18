/**
 * What session orchestration needs from storage (BB-36). The service talks only to this interface.
 *
 * The Drizzle implementation lands with the authorization layer (BB-10): learner tables are read
 * only through it, so the queries live in `packages/db` and are reached from `server/access`.
 * Until then `memory-store.ts` implements this for tests.
 *
 * Contract for every implementation:
 * - `createSession` keeps at most one session that is not done per learner. When one exists it
 *   returns that one and creates nothing (two tabs, a double click).
 * - `withSession` holds the session row locked (select ... for update) while `change` runs, and
 *   writes everything it returns in one transaction, or nothing when it throws. This is what keeps
 *   tries used from passing tries allowed when two tries arrive at once.
 */
import type { Accommodation, Decision, TryAnalysis } from '@basabridge/contracts';
import type { AnswerKey } from './answer-check';
import type { SessionState, TrySummary } from './machine';

export interface StoredQuestion {
  id: string;
  key: AnswerKey;
}

export interface StoredAnswer {
  questionId: string;
  chosen: number[];
  correct: boolean;
  responseMs: number;
  accommodations: Accommodation[];
}

export interface SessionSnapshot {
  session: SessionState;
  /** Oldest first. */
  tries: TrySummary[];
  answers: StoredAnswer[];
}

export interface SessionChange<T> {
  result: T;
  /** The whole new session row. */
  session?: SessionState;
  addTry?: { summary: TrySummary; analysis: TryAnalysis };
  addAnswer?: StoredAnswer;
  decision?: Decision;
}

export interface SessionStore {
  /** `learners.level`. Undefined when the user is not a learner. */
  learnerLevel(learnerId: string): Promise<number | undefined>;
  /** The learner's session that is not done, if any. */
  openSession(learnerId: string): Promise<SessionState | undefined>;
  createSession(values: Omit<SessionState, 'id'>): Promise<SessionState>;
  /** Ids of stories at exactly this level. */
  storyIdsAtLevel(level: number): Promise<string[]>;
  /** Ids of every story the learner has had a session for. */
  storyIdsSeen(learnerId: string): Promise<string[]>;
  /** The story's questions in the order they are asked. */
  questions(storyId: string): Promise<StoredQuestion[]>;
  /** Throws `SessionError('not_found')` when there is no such session. */
  withSession<T>(
    sessionId: string,
    change: (snapshot: SessionSnapshot) => SessionChange<T>,
  ): Promise<T>;
  /** Reads a session without changing it. */
  snapshot(sessionId: string): Promise<SessionSnapshot | undefined>;
}
