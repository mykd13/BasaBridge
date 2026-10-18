import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let user: { id: string; role: 'student' | 'parent' } | null = null;
vi.mock('../session', () => ({ getSessionUser: async () => user }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const { setStudentData, resetStudentData } = await import('./data');
const actions = await import('./actions');
const fx = await import('./test-fixtures');

const LEARNER = '00000000-0000-4000-8000-000000000001';
const submission = {
  sessionId: fx.SESSION_ID,
  questionId: fx.QUESTION_ID,
  chosen: [1],
  responseMs: 4200,
  accommodations: ['question_read_aloud'],
};

beforeEach(() => {
  user = { id: LEARNER, role: 'student' };
});
afterEach(resetStudentData);

describe('student actions', () => {
  it('refuses everything when nobody, or a parent, is signed in', async () => {
    setStudentData(fx.fakeStudentData());
    for (const who of [null, { id: LEARNER, role: 'parent' as const }]) {
      user = who;
      expect(await actions.submitAnswerAction(submission)).toEqual({ ok: false });
      expect(
        await actions.finishTryAction({
          sessionId: fx.SESSION_ID,
          tryId: fx.TRY_ID,
          mode: 'audio',
        }),
      ).toEqual({ ok: false });
      expect(await actions.markMisheardAction({ index: 1 })).toEqual({ ok: false });
    }
  });

  it('scores on the server: the learner comes from the session and the answer is checked', async () => {
    const seen: unknown[] = [];
    setStudentData(
      fx.fakeStudentData({
        submitAnswer: async (id, input) => {
          seen.push(id, input);
          return { ok: true, data: fx.feedbackWrong };
        },
      }),
    );
    const result = await actions.submitAnswerAction({ ...submission, learnerId: 'someone-else' });
    expect(result).toEqual({ ok: true, data: fx.feedbackWrong });
    expect(seen[0]).toBe(LEARNER);
    expect(seen[1]).toEqual(submission);
  });

  it('records the accommodation on the answer it affects', async () => {
    let received: { accommodations?: string[] } | undefined;
    setStudentData(
      fx.fakeStudentData({
        submitAnswer: async (_id, input) => {
          received = input;
          return { ok: true, data: fx.feedbackWrong };
        },
      }),
    );
    await actions.submitAnswerAction(submission);
    expect(received?.accommodations).toEqual(['question_read_aloud']);
  });

  it('rejects an answer that is not a valid submission', async () => {
    const spy = vi.fn();
    setStudentData(fx.fakeStudentData({ submitAnswer: spy }));
    expect(await actions.submitAnswerAction({ ...submission, sessionId: 'nope' })).toEqual({
      ok: false,
    });
    expect(await actions.submitAnswerAction({ ...submission, chosen: [] })).toEqual({ ok: false });
    expect(
      await actions.submitAnswerAction({ ...submission, accommodations: ['telepathy'] }),
    ).toEqual({ ok: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('finishes a try only for a well formed id and returns where to go', async () => {
    setStudentData(fx.fakeStudentData());
    expect(
      await actions.finishTryAction({ sessionId: fx.SESSION_ID, tryId: fx.TRY_ID, mode: 'audio' }),
    ).toEqual({ ok: true, data: { next: 'analysis' } });
    expect(
      await actions.finishTryAction({ sessionId: fx.SESSION_ID, tryId: 'short', mode: 'audio' }),
    ).toEqual({ ok: false });
    expect(
      await actions.finishTryAction({
        sessionId: fx.SESSION_ID,
        tryId: fx.TRY_ID,
        mode: 'psychic',
      }),
    ).toEqual({ ok: false });
  });

  it('fails visibly when the engine is not wired in', async () => {
    expect(await actions.submitAnswerAction(submission)).toEqual({ ok: false });
    expect(
      await actions.finishTryAction({ sessionId: fx.SESSION_ID, tryId: fx.TRY_ID, mode: 'audio' }),
    ).toEqual({ ok: false });
    expect(await actions.recordWordTapAction({ sessionId: fx.SESSION_ID })).toEqual({ ok: false });
    expect(await actions.startPlacementStoryAction()).toEqual({ ok: false });
  });

  it('placement: start goes to reading and later goes home', async () => {
    setStudentData(fx.fakeStudentData());
    await expect(actions.startPlacementStoryAction()).rejects.toThrow('REDIRECT:/read');
    await expect(actions.deferPlacementAction()).rejects.toThrow('REDIRECT:/home');
  });

  it('records a word tap on the session, for the learner in the session only', async () => {
    const spy = vi.fn(async () => ({ ok: true as const, data: null }));
    setStudentData(fx.fakeStudentData({ recordWordTap: spy }));
    expect(
      await actions.recordWordTapAction({ sessionId: fx.SESSION_ID, learnerId: 'someone-else' }),
    ).toEqual({ ok: true, data: null });
    expect(spy).toHaveBeenCalledWith(LEARNER, { sessionId: fx.SESSION_ID });
    expect(await actions.recordWordTapAction({ sessionId: 'nope' })).toEqual({ ok: false });
    user = null;
    expect(await actions.recordWordTapAction({ sessionId: fx.SESSION_ID })).toEqual({ ok: false });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('marks a word as misheard through the server', async () => {
    const spy = vi.fn(async () => ({ ok: true as const, data: null }));
    setStudentData(fx.fakeStudentData({ markMisheard: spy }));
    expect(await actions.markMisheardAction({ index: 4 })).toEqual({ ok: true, data: null });
    expect(spy).toHaveBeenCalledWith(LEARNER, { index: 4 });
    expect(await actions.markMisheardAction({ index: -1 })).toEqual({ ok: false });
  });
});
