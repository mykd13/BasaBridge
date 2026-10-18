/**
 * Session orchestration (docs/PLAN.md section 6, BB-36): start or resume, tries, the counted try,
 * answers and the next story. Every call names the learner it acts for and refuses sessions that
 * belong to someone else. Routes reach this only after the authorization layer (BB-10) has checked
 * that the signed-in user may act for that learner.
 *
 * Not here yet (Phase B, after BB-19 and BB-20): weighting answers, the pass rule, level movement,
 * the focus skill and teacher notes. They run where `submitAnswer` finishes the session.
 */
import type { Accommodation } from '@basabridge/contracts';
import type { TryRecord } from '@basabridge/speech';
import { checkAnswer } from './answer-check';
import { triesDecision } from './decisions';
import {
  applyTry,
  resumePoint,
  SessionError,
  sessionValues,
  startAnswering,
  type ResumePoint,
  type SessionState,
  type TryOutcome,
} from './machine';
import { chooseStory } from './next-story';
import type { SessionSnapshot, SessionStore } from './store';

export interface SessionView {
  session: SessionState;
  resume: ResumePoint;
}

async function view(store: SessionStore, snap: SessionSnapshot): Promise<SessionView> {
  const questions = await store.questions(snap.session.storyId);
  return {
    session: snap.session,
    resume: resumePoint(
      snap.session,
      snap.tries,
      questions.map((q) => q.id),
      snap.answers.map((a) => a.questionId),
    ),
  };
}

function owned(snap: SessionSnapshot, learnerId: string): SessionSnapshot {
  if (snap.session.learnerId !== learnerId) throw new SessionError('not_found');
  return snap;
}

async function load(store: SessionStore, learnerId: string, sessionId: string) {
  const snap = await store.snapshot(sessionId);
  if (!snap) throw new SessionError('not_found');
  return owned(snap, learnerId);
}

/**
 * The learner's open session, or a new one with a story at their level they have not read.
 * Leaving a session (closing the tab, losing the connection) does not end it: the learner comes
 * back to the same story with the same tries until it is done.
 */
export async function startOrResume(
  store: SessionStore,
  learnerId: string,
  random: () => number = Math.random,
): Promise<SessionView & { resumed: boolean }> {
  const open = await store.openSession(learnerId);
  if (open) return { ...(await currentSession(store, learnerId, open.id)), resumed: true };

  const level = await store.learnerLevel(learnerId);
  if (level === undefined) throw new SessionError('no_learner');
  const storyId = chooseStory(
    await store.storyIdsAtLevel(level),
    await store.storyIdsSeen(learnerId),
    random,
  );
  const created = await store.createSession({ learnerId, storyId, ...sessionValues(level) });
  return { ...(await currentSession(store, learnerId, created.id)), resumed: false };
}

export async function currentSession(
  store: SessionStore,
  learnerId: string,
  sessionId: string,
): Promise<SessionView> {
  return view(store, await load(store, learnerId, sessionId));
}

/** Store one analysed try. `record` comes from `toTryRecord` on the server, never from the browser. */
export async function submitTry(
  store: SessionStore,
  learnerId: string,
  sessionId: string,
  record: TryRecord,
  now: Date = new Date(),
): Promise<SessionView & { outcome: TryOutcome }> {
  const outcome = await store.withSession(sessionId, (snap) => {
    owned(snap, learnerId);
    const summary = {
      id: crypto.randomUUID(),
      completed: record.completed,
      wordsRight: record.wordsRight,
      wordsTotal: record.wordsTotal,
      wordsPerMinute: record.wordsPerMinute,
      createdAt: now,
    };
    const applied = applyTry(snap.session, snap.tries, summary);
    const usedUp = applied.outcome === 'answering' || applied.outcome === 'tries_used_up';
    return {
      result: applied.outcome,
      session: applied.session,
      addTry: { summary, analysis: record.analysis },
      ...(usedUp && {
        decision: triesDecision(applied.session, [...snap.tries, summary], applied.counted),
      }),
    };
  });
  return { ...(await currentSession(store, learnerId, sessionId)), outcome };
}

/** The learner chooses to answer before tries run out. */
export async function beginAnswering(
  store: SessionStore,
  learnerId: string,
  sessionId: string,
): Promise<SessionView> {
  await store.withSession(sessionId, (snap) => {
    owned(snap, learnerId);
    return { result: null, session: startAnswering(snap.session, snap.tries) };
  });
  return currentSession(store, learnerId, sessionId);
}

export interface AnswerInput {
  questionId: string;
  chosen: number[];
  responseMs: number;
  accommodations: Accommodation[];
}

/** Check and store one answer. The last answer finishes the session. */
export async function submitAnswer(
  store: SessionStore,
  learnerId: string,
  sessionId: string,
  answer: AnswerInput,
): Promise<SessionView & { correct: boolean }> {
  const { storyId } = (await load(store, learnerId, sessionId)).session;
  const questions = await store.questions(storyId);

  const correct = await store.withSession(sessionId, (snap) => {
    owned(snap, learnerId);
    if (snap.session.status !== 'answering') throw new SessionError('not_answering');
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) throw new SessionError('bad_answer');
    if (snap.answers.some((a) => a.questionId === question.id)) {
      throw new SessionError('already_answered');
    }
    const check = checkAnswer(question.key, answer.chosen);
    if (!check.valid || !Number.isInteger(answer.responseMs) || answer.responseMs < 0) {
      throw new SessionError('bad_answer');
    }
    const answered = snap.answers.length + 1;
    // Phase B (BB-19, BB-20): score, pass rule, level, focus and notes run here, in that order.
    const finished = answered >= questions.length;
    return {
      result: check.correct,
      addAnswer: {
        questionId: question.id,
        chosen: [...answer.chosen],
        correct: check.correct,
        responseMs: answer.responseMs,
        accommodations: [...answer.accommodations],
      },
      ...(finished && { session: { ...snap.session, status: 'done' as const } }),
    };
  });
  return { ...(await currentSession(store, learnerId, sessionId)), correct };
}
