import { describe, expect, it } from 'vitest';
import { EngineError } from './errors';
import { makeWorld, rightChoice, type World } from './fixtures';
import { skipPlacement, startPlacement, submitPlacementRead } from './placement';
import { continueToQuestions, startSession, submitAnswer, submitTry } from './session';

const lid = (w: World) => [...w.learners.profiles.keys()][0]!;

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof EngineError) return e.code;
    throw e;
  }
  return 'no_error';
}

describe('silent reads need a reason when the learner may use the microphone', () => {
  it('rejects a bare silent try in a voice session and accepts one with a reason', async () => {
    const w = makeWorld();
    const s = await startSession(w.deps, lid(w));
    expect(s.voiceMode).toBe('voice');
    expect(await codeOf(submitTry(w.deps, lid(w), s.id, { mode: 'silent', listened: false }))).toBe(
      'voice_required',
    );
    expect(w.sessions.rows.get(s.id)?.tries).toHaveLength(0);
    const ok = await submitTry(w.deps, lid(w), s.id, {
      mode: 'silent',
      listened: false,
      micState: 'unavailable',
    });
    expect(ok.tries).toHaveLength(1);
  });

  it('does not ask a learner without microphone approval for a reason', async () => {
    const w = makeWorld({ learner: { micAllowed: false } });
    const s = await startSession(w.deps, lid(w));
    const ok = await submitTry(w.deps, lid(w), s.id, { mode: 'silent', listened: false });
    expect(ok.tries).toHaveLength(1);
  });

  it('applies the same rule to placement reads', async () => {
    const w = makeWorld({
      learner: { placement: { state: 'none', finishedAt: null, result: null } },
    });
    const p = await startPlacement(w.deps, lid(w));
    expect(await codeOf(submitPlacementRead(w.deps, lid(w), p.id, { mode: 'silent' }))).toBe(
      'voice_required',
    );
    const v = await submitPlacementRead(w.deps, lid(w), p.id, {
      mode: 'silent',
      micState: 'blocked',
    });
    expect(v.status).toBe('answering');
  });
});

describe('skipping placement', () => {
  const progress = {
    level: 42,
    passedStories: 1,
    recentWordsRight: [0.9],
    posterior: null,
    history: [],
  };

  it('is refused once skipped and keeps the earned progress', async () => {
    const w = makeWorld({
      learner: {
        placement: { state: 'skipped', finishedAt: new Date(), result: null },
        progress,
      },
    });
    expect(await codeOf(skipPlacement(w.deps, lid(w)))).toBe('placement_done');
    expect(w.learners.profiles.get(lid(w))?.progress.level).toBe(42);
  });

  it('abandons a retake without wiping the earlier result or progress', async () => {
    const w = makeWorld({
      learner: {
        placement: {
          state: 'completed',
          finishedAt: new Date('2025-12-01T00:00:00Z'),
          result: {
            level: 42,
            theta: 0,
            sd: 0.4,
            confidence: 'building',
            storiesRead: 3,
            flags: [],
            recommendedHelp: 'standard',
          },
        },
        progress,
      },
    });
    const v = await startPlacement(w.deps, lid(w));
    expect(v.status).toBe('reading');
    const gate = await skipPlacement(w.deps, lid(w));
    expect(gate.state).toBe('completed');
    const profile = w.learners.profiles.get(lid(w))!;
    expect(profile.progress.level).toBe(42);
    expect(profile.placement.result?.level).toBe(42);
  });
});

describe('response time from the browser', () => {
  it('is capped before it is stored', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false, micState: 'blocked' });
    await continueToQuestions(w.deps, id, s.id);
    const q = (await w.bank.get(s.story.id))!.questions[0]!;
    await submitAnswer(w.deps, id, s.id, {
      questionId: q.id,
      chosen: rightChoice(q),
      responseMs: 2_000_000_000,
      accommodations: [],
    });
    expect(w.sessions.rows.get(s.id)?.answers[0]?.responseMs).toBe(600_000);
  });
});

describe('concurrency guard', () => {
  it('rejects a stale save in both repositories', async () => {
    const w = makeWorld();
    await startSession(w.deps, lid(w));
    const a = (await w.sessions.findActive(lid(w)))!;
    const b = (await w.sessions.findActive(lid(w)))!;
    await w.sessions.save(a);
    expect(await codeOf(w.sessions.save(b))).toBe('conflict');
  });

  it('applies a finished story to the learner once when two tabs send the last answer', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false, micState: 'blocked' });
    await continueToQuestions(w.deps, id, s.id);
    const story = (await w.bank.get(s.story.id))!;
    for (const q of story.questions.slice(0, -1)) {
      await submitAnswer(w.deps, id, s.id, {
        questionId: q.id,
        chosen: rightChoice(q),
        responseMs: 6000,
        accommodations: [],
      });
    }
    const last = story.questions.at(-1)!;
    const send = () =>
      submitAnswer(w.deps, id, s.id, {
        questionId: last.id,
        chosen: rightChoice(last),
        responseMs: 6000,
        accommodations: [],
      });
    const settled = await Promise.allSettled([send(), send()]);
    expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(w.learners.profiles.get(id)?.progress.history).toHaveLength(1);
  });
});
