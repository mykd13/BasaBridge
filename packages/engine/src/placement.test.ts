import { describe, expect, it } from 'vitest';
import { EngineError } from './errors';
import { analysis, makeWorld, rightChoice, uuid, wrongChoice, type World } from './fixtures';
import {
  getCurrentPlacement,
  getPlacementGate,
  skipPlacement,
  startPlacement,
  submitPlacementAnswer,
  submitPlacementRead,
} from './placement';
import { startSession } from './session';

const fresh = (over = {}) =>
  makeWorld({
    learner: { placement: { state: 'none', finishedAt: null, result: null }, ...over },
  });
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

/** Read silently and answer the story on screen. Returns the view after the last answer. */
async function playStory(w: World, id: string, pick: typeof rightChoice, silent = true) {
  let v = await getCurrentPlacement(w.deps, lid(w));
  if (!v) throw new Error('no placement in progress');
  if (v.status === 'reading') {
    v = silent
      ? await submitPlacementRead(w.deps, lid(w), id, { mode: 'silent', micState: 'blocked' })
      : await submitPlacementRead(w.deps, lid(w), id, {
          mode: 'voice',
          captureId: (() => {
            const c = `capture-${uuid()}`;
            w.analyses.add(lid(w), c, analysis(18));
            return c;
          })(),
        });
  }
  const story = (await w.placementBank.get(v.story!.id))!;
  for (const q of story.questions) {
    const ack = await submitPlacementAnswer(w.deps, lid(w), id, {
      questionId: q.id,
      chosen: pick(q),
      responseMs: 6000,
    });
    v = ack.placement;
  }
  return v;
}

describe('placement gate', () => {
  it('requires placement for a new learner', async () => {
    const w = fresh();
    expect(await getPlacementGate(w.deps, lid(w))).toEqual({
      required: true,
      state: 'none',
      canRetake: false,
      due: false,
    });
  });

  it('is not required after a skip, but is due again', async () => {
    const w = fresh();
    const gate = await skipPlacement(w.deps, lid(w));
    expect(gate).toMatchObject({ required: false, state: 'skipped', due: true });
    const s = await startSession(w.deps, lid(w));
    // Grade 3 starts at the grade default.
    expect(s.level).toBeGreaterThan(0);
    expect(w.learners.profiles.get(lid(w))?.progress.level).toBe(30);
  });
});

describe('placement flow', () => {
  it('starts from the grade, offers no help and no Learn', async () => {
    const w = fresh();
    const v = await startPlacement(w.deps, lid(w));
    expect(v.status).toBe('reading');
    expect(v.story?.id).toBeDefined();
    expect(v.supports).toEqual({
      listenThenRead: false,
      wordTap: false,
      questionReadAloud: false,
      learn: false,
    });
    expect(v.maxStories).toBe(4);
    expect(w.placements.rows.get(v.id)?.stories[0]?.level).toBe(30);
    expect((await getPlacementGate(w.deps, lid(w))).state).toBe('in_progress');
  });

  it('resumes the unfinished placement', async () => {
    const w = fresh();
    const a = await startPlacement(w.deps, lid(w));
    const b = await startPlacement(w.deps, lid(w));
    expect(b.id).toBe(a.id);
  });

  it('never reveals whether an answer was right', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    const v = await submitPlacementRead(w.deps, lid(w), p.id, {
      mode: 'silent',
      micState: 'blocked',
    });
    const q = (await w.placementBank.get(v.story!.id))!.questions[0]!;
    const ack = await submitPlacementAnswer(w.deps, lid(w), p.id, {
      questionId: q.id,
      chosen: rightChoice(q),
      responseMs: 6000,
    });
    expect(Object.keys(ack).sort()).toEqual(['accepted', 'placement']);
    expect(JSON.stringify(ack)).not.toContain('correct');
    expect(JSON.stringify(ack)).not.toContain('The evidence sentence');
  });

  it('places a strong reader higher than a weak one and finishes within four stories', async () => {
    const strong = fresh();
    const weak = fresh();
    for (const [w, pick] of [
      [strong, rightChoice],
      [weak, wrongChoice],
    ] as const) {
      const p = await startPlacement(w.deps, lid(w));
      let v = await getCurrentPlacement(w.deps, lid(w));
      let guard = 0;
      while (v && v.status !== 'done' && guard++ < 5) v = await playStory(w, p.id, pick);
      expect(v?.status).toBe('done');
      expect(v?.result?.storiesRead).toBeLessThanOrEqual(4);
      expect(v?.result?.storiesRead).toBeGreaterThanOrEqual(2);
    }
    const hi = strong.learners.profiles.get(lid(strong))!;
    const lo = weak.learners.profiles.get(lid(weak))!;
    expect(hi.progress.level).toBeGreaterThan(lo.progress.level);
    expect(hi.placement.state).toBe('completed');
    expect(hi.progress.posterior).not.toBeNull();
    expect(hi.progress.history.length).toBeGreaterThan(0);
  });

  it('hands the result to the main course: the next session starts at the placed level', async () => {
    const w = makeWorld({
      learner: { placement: { state: 'none', finishedAt: null, result: null } },
      levels: [15, 20, 25, 30, 40, 50],
      perLevel: 3,
    });
    expect(await codeOf(startSession(w.deps, lid(w)))).toBe('placement_required');
    const p = await startPlacement(w.deps, lid(w));
    let v = await getCurrentPlacement(w.deps, lid(w));
    let guard = 0;
    while (v && v.status !== 'done' && guard++ < 5) {
      v = await playStory(w, p.id, rightChoice, false);
    }
    const placed = v!.result!.level;
    expect(await getPlacementGate(w.deps, lid(w))).toMatchObject({ required: false });
    const s = await startSession(w.deps, lid(w));
    expect(s.level).toBe(placed);
    expect(await codeOf(startPlacement(w.deps, lid(w)))).toBe('placement_done');
  });
});

describe('microphone gate in placement', () => {
  it('runs silently for an under-13 learner without approval, flags it and caps confidence', async () => {
    const w = fresh({ micAllowed: false });
    const p = await startPlacement(w.deps, lid(w));
    expect(p.voiceMode).toBe('silent');
    expect(
      await codeOf(
        submitPlacementRead(w.deps, lid(w), p.id, { mode: 'voice', captureId: 'abcdefgh' }),
      ),
    ).toBe('mic_not_allowed');
    let v = await getCurrentPlacement(w.deps, lid(w));
    let guard = 0;
    while (v && v.status !== 'done' && guard++ < 5) v = await playStory(w, p.id, rightChoice);
    expect(v?.result?.flags).toContain('voice_missing');
    expect(['none', 'early']).toContain(v?.result?.confidence);
    expect(v?.voiceRecheckDue).toBe(true);
  });

  it('asks for a re-check once voice is approved, even before 30 days', async () => {
    const w = fresh({ micAllowed: false });
    const p = await startPlacement(w.deps, lid(w));
    let v = await getCurrentPlacement(w.deps, lid(w));
    let guard = 0;
    while (v && v.status !== 'done' && guard++ < 5) v = await playStory(w, p.id, rightChoice);
    expect((await getPlacementGate(w.deps, lid(w))).canRetake).toBe(false);
    w.learners.profiles.get(lid(w))!.micAllowed = true;
    const gate = await getPlacementGate(w.deps, lid(w));
    expect(gate).toMatchObject({ due: true, canRetake: true });
    const again = await startPlacement(w.deps, lid(w));
    expect(again.voiceMode).toBe('voice');
  });
});

describe('placement reads with voice', () => {
  it('scores a voice read and uses words right', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    const c = `capture-${uuid()}`;
    w.analyses.add(lid(w), c, analysis(18));
    const v = await submitPlacementRead(w.deps, lid(w), p.id, { mode: 'voice', captureId: c });
    expect(v.status).toBe('answering');
    expect(w.placements.rows.get(p.id)?.stories[0]).toMatchObject({
      readStatus: 'scored',
      wordsRightShare: 0.9,
    });
  });

  it('retries a failed recording once, then skips the story and never scores it as zero', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    const first = await submitPlacementRead(w.deps, lid(w), p.id, { mode: 'voice_failed' });
    expect(first.status).toBe('reading');
    expect(first.retryRead).toBe(true);
    const second = await submitPlacementRead(w.deps, lid(w), p.id, { mode: 'voice_failed' });
    expect(second.status).toBe('answering');
    const rec = w.placements.rows.get(p.id)!.stories[0]!;
    expect(rec.readStatus).toBe('skipped');
    expect(rec.wordsRightShare).toBeNull();
  });

  it('treats an unusable analysis as a failed recording', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    const c = `capture-${uuid()}`;
    w.analyses.add(lid(w), c, analysis(0, { wordsTotal: 0, words: [] }));
    const v = await submitPlacementRead(w.deps, lid(w), p.id, { mode: 'voice', captureId: c });
    expect(v.status).toBe('reading');
    expect(v.retryRead).toBe(true);
  });

  it('flags low decoding when words right stay low', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    let guard = 0;
    let v = await getCurrentPlacement(w.deps, lid(w));
    while (v && v.status !== 'done' && guard++ < 5) {
      const c = `capture-${uuid()}`;
      w.analyses.add(lid(w), c, analysis(10));
      if (v.status === 'reading') {
        v = await submitPlacementRead(w.deps, lid(w), p.id, { mode: 'voice', captureId: c });
      }
      const story = (await w.placementBank.get(v.story!.id))!;
      for (const q of story.questions) {
        v = (
          await submitPlacementAnswer(w.deps, lid(w), p.id, {
            questionId: q.id,
            chosen: rightChoice(q),
            responseMs: 6000,
          })
        ).placement;
      }
    }
    expect(v?.result?.flags).toContain('low_decoding');
    expect(v?.result?.recommendedHelp).toBe('more');
  });
});

describe('placement rules', () => {
  it('rejects answers before the read, double answers and wrong shapes', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    const story = (await w.placementBank.get(p.story!.id))!;
    const q = story.questions[0]!;
    const body = { questionId: q.id, chosen: [0], responseMs: 6000 };
    expect(await codeOf(submitPlacementAnswer(w.deps, lid(w), p.id, body))).toBe(
      'session_wrong_state',
    );
    await submitPlacementRead(w.deps, lid(w), p.id, { mode: 'silent', micState: 'blocked' });
    expect(
      await codeOf(submitPlacementAnswer(w.deps, lid(w), p.id, { ...body, chosen: [0, 1] })),
    ).toBe('bad_choice');
    await submitPlacementAnswer(w.deps, lid(w), p.id, body);
    expect(await codeOf(submitPlacementAnswer(w.deps, lid(w), p.id, body))).toBe(
      'already_answered',
    );
  });

  it('hides another learner placement', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    const other = fresh();
    other.placements.rows.set(p.id, w.placements.rows.get(p.id)!);
    expect(
      await codeOf(
        submitPlacementRead(other.deps, lid(other), p.id, { mode: 'silent', micState: 'blocked' }),
      ),
    ).toBe('placement_not_found');
  });

  it('allows a retake only after 30 days', async () => {
    const w = makeWorld({
      learner: {
        placement: {
          state: 'completed',
          finishedAt: new Date('2026-01-10T00:00:00Z'),
          result: null,
        },
      },
    });
    w.clock.now = new Date('2026-02-01T00:00:00Z');
    expect(await codeOf(startPlacement(w.deps, lid(w)))).toBe('placement_done');
    w.clock.now = new Date('2026-02-10T00:00:00Z');
    const v = await startPlacement(w.deps, lid(w));
    expect(v.status).toBe('reading');
    expect(w.placements.rows.get(v.id)?.startLevel).toBe(15);
  });

  it('cannot skip a finished placement', async () => {
    const w = makeWorld();
    expect(await codeOf(skipPlacement(w.deps, lid(w)))).toBe('placement_done');
  });

  it('closes an open placement when it is skipped', async () => {
    const w = fresh();
    const p = await startPlacement(w.deps, lid(w));
    await skipPlacement(w.deps, lid(w));
    expect(w.placements.rows.get(p.id)?.status).toBe('done');
    expect(await getCurrentPlacement(w.deps, lid(w))).toBeNull();
  });
});
