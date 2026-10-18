/**
 * An in-memory `SessionStore` for tests, until the Drizzle store lands with BB-10.
 * It starts empty: tests add the learners and stories they need. Never used by a route.
 * One lock covers the whole store, which is stricter than the per-row lock the real store takes.
 */
import type { Decision, TryAnalysis } from '@basabridge/contracts';
import { SessionError, type SessionState, type TrySummary } from './machine';
import type {
  SessionChange,
  SessionSnapshot,
  SessionStore,
  StoredAnswer,
  StoredQuestion,
} from './store';

interface StoryRow {
  id: string;
  level: number;
  questions: StoredQuestion[];
}

export class MemorySessionStore implements SessionStore {
  readonly learners = new Map<string, number>();
  readonly stories: StoryRow[] = [];
  readonly sessions = new Map<string, SessionState>();
  readonly tries = new Map<string, { summary: TrySummary; analysis: TryAnalysis }[]>();
  readonly answers = new Map<string, StoredAnswer[]>();
  readonly decisions: { learnerId: string; decision: Decision }[] = [];
  private lock: Promise<unknown> = Promise.resolve();

  private serial<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = this.lock.then(fn);
    this.lock = run.catch(() => undefined);
    return run;
  }

  async learnerLevel(learnerId: string) {
    return this.learners.get(learnerId);
  }

  async openSession(learnerId: string) {
    return [...this.sessions.values()].find(
      (s) => s.learnerId === learnerId && s.status !== 'done',
    );
  }

  createSession(values: Omit<SessionState, 'id'>) {
    return this.serial(() => {
      const open = [...this.sessions.values()].find(
        (s) => s.learnerId === values.learnerId && s.status !== 'done',
      );
      if (open) return open;
      const row = { ...values, id: crypto.randomUUID() };
      this.sessions.set(row.id, row);
      return row;
    });
  }

  async storyIdsAtLevel(level: number) {
    return this.stories.filter((s) => s.level === level).map((s) => s.id);
  }

  async storyIdsSeen(learnerId: string) {
    return [...this.sessions.values()]
      .filter((s) => s.learnerId === learnerId)
      .map((s) => s.storyId);
  }

  async questions(storyId: string) {
    return this.stories.find((s) => s.id === storyId)?.questions ?? [];
  }

  async snapshot(sessionId: string): Promise<SessionSnapshot | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return {
      session,
      tries: (this.tries.get(sessionId) ?? []).map((t) => t.summary),
      answers: [...(this.answers.get(sessionId) ?? [])],
    };
  }

  withSession<T>(sessionId: string, change: (s: SessionSnapshot) => SessionChange<T>): Promise<T> {
    return this.serial(async () => {
      const snap = await this.snapshot(sessionId);
      if (!snap) throw new SessionError('not_found');
      const c = change(snap);
      if (c.addTry) this.tries.set(sessionId, [...(this.tries.get(sessionId) ?? []), c.addTry]);
      if (c.addAnswer) this.answers.set(sessionId, [...snap.answers, c.addAnswer]);
      if (c.session) this.sessions.set(sessionId, c.session);
      if (c.decision)
        this.decisions.push({ learnerId: snap.session.learnerId, decision: c.decision });
      return c.result;
    });
  }
}
