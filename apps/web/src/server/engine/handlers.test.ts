import { describe, expect, it } from 'vitest';
import { SessionView } from '@basabridge/contracts/engine';
import { analysis, makeWorld, rightChoice } from '@basabridge/engine/testing';
import { createEngineHandlers } from './handlers';
import type { ContextResolver } from './context';

const post = (body: unknown) =>
  new Request('http://localhost/api/engine', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = () => new Request('http://localhost/api/engine');

function setup() {
  const w = makeWorld({ levels: [15] });
  const learnerId = [...w.learners.profiles.keys()][0]!;
  const resolve: ContextResolver = async () => ({ deps: w.deps, learnerId });
  return { w, learnerId, h: createEngineHandlers(() => resolve) };
}

describe('engine handlers', () => {
  it('answers not_configured until a resolver is set', async () => {
    const h = createEngineHandlers(() => null);
    const res = await h.sessionStart(get());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'not_configured' });
  });

  it('answers 401 when nobody is signed in', async () => {
    const h = createEngineHandlers(() => async () => null);
    expect((await h.sessionStart(get())).status).toBe(401);
  });

  it('rejects a bad id and a bad body without calling the engine', async () => {
    const { h } = setup();
    expect((await h.sessionGet(get(), { id: 'nope' })).status).toBe(400);
    const s = await (await h.sessionStart(get())).json();
    expect((await h.sessionTry(post({ mode: 'voice' }), { id: s.id })).status).toBe(400);
    expect((await h.sessionAnswer(post({}), { id: s.id })).status).toBe(400);
  });

  it('maps rule errors to status codes', async () => {
    const { h } = setup();
    const s = await (await h.sessionStart(get())).json();
    const res = await h.sessionContinue(post({}), { id: s.id });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'no_completed_try' });
  });

  it('runs a whole story: start, read, continue, answer, result, new story', async () => {
    const { w, learnerId, h } = setup();
    const started = SessionView.parse(await (await h.sessionStart(get())).json());
    expect(started.triesAllowed).toBe(5);

    w.analyses.add(learnerId, 'capture-abc12345', analysis(19));
    const afterTry = SessionView.parse(
      await (
        await h.sessionTry(post({ mode: 'voice', captureId: 'capture-abc12345' }), {
          id: started.id,
        })
      ).json(),
    );
    expect(afterTry.next).toBe('read_or_continue');

    const answering = SessionView.parse(
      await (await h.sessionContinue(post({}), { id: started.id })).json(),
    );
    expect(answering.questions).toHaveLength(5);
    expect(JSON.stringify(answering)).not.toContain('evidence');

    const story = (await w.bank.get(started.story.id))!;
    let last;
    for (const q of story.questions) {
      const res = await h.sessionAnswer(
        post({ questionId: q.id, chosen: rightChoice(q), responseMs: 6000 }),
        { id: started.id },
      );
      expect(res.status).toBe(200);
      last = await res.json();
    }
    expect(last.result.outcome).toBe('passed');

    const done = SessionView.parse(await (await h.sessionGet(get(), { id: started.id })).json());
    expect(done.next).toBe('new_story');
    const next = SessionView.parse(
      await (await h.sessionNewStory(post({}), { id: started.id })).json(),
    );
    expect(next.id).not.toBe(started.id);
    expect(next.level).toBe(15);
  });

  it('reports the placement gate with the current placement', async () => {
    const w = makeWorld({
      learner: { placement: { state: 'none', finishedAt: null, result: null } },
    });
    const learnerId = [...w.learners.profiles.keys()][0]!;
    const h = createEngineHandlers(() => async () => ({ deps: w.deps, learnerId }));
    expect((await h.sessionStart(get())).status).toBe(403);
    expect(await (await h.placementCurrent(get())).json()).toEqual({
      gate: { required: true, state: 'none', canRetake: false, due: false },
      current: null,
    });
    const p = await (await h.placementStart(get())).json();
    expect(p.supports.learn).toBe(false);
    const skipped = await (await h.placementSkip(get())).json();
    expect(skipped.state).toBe('skipped');
    expect((await h.sessionStart(get())).status).toBe(200);
  });
});
