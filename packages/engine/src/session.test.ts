import { describe, expect, it } from 'vitest';
import { EngineError } from './errors';
import { analysis, makeWorld, rightChoice, uuid, wrongChoice, type World } from './fixtures';
import {
  continueToQuestions,
  getCurrentSession,
  newStory,
  startSession,
  submitAnswer,
  submitTry,
} from './session';

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

async function voiceTry(w: World, wordsRight: number, over = {}) {
  const id = lid(w);
  const capture = `capture-${uuid()}`;
  w.analyses.add(id, capture, analysis(wordsRight, over));
  return capture;
}

/** Read once silently and answer every question with `pick`. Returns the last feedback. */
async function playSilent(
  w: World,
  pick: (q: Parameters<typeof rightChoice>[0]) => number[],
  ms = 6000,
) {
  const id = lid(w);
  const s = await startSession(w.deps, id);
  await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false });
  await continueToQuestions(w.deps, id, s.id);
  const story = (await w.bank.get(s.story.id))!;
  let last;
  for (const q of story.questions) {
    last = await submitAnswer(w.deps, id, s.id, {
      questionId: q.id,
      chosen: pick(q),
      responseMs: ms,
      accommodations: [],
    });
  }
  return last!;
}

describe('start and resume', () => {
  it('uses the tries from packages/levels, not from the caller', async () => {
    const w = makeWorld({ levels: [15] });
    const s = await startSession(w.deps, lid(w));
    expect(s.triesAllowed).toBe(5);
    expect(s.triesLeft).toBe(5);
    expect(s.next).toBe('read');
    expect(s.questions).toEqual([]);
  });

  it('gives unlimited tries at the lowest levels', async () => {
    const w = makeWorld({ levels: [5] });
    const s = await startSession(w.deps, lid(w));
    expect(s.triesAllowed).toBeNull();
    expect(s.triesLeft).toBeNull();
  });

  it('resumes the unfinished session instead of starting a second one', async () => {
    const w = makeWorld();
    const a = await startSession(w.deps, lid(w));
    const b = await startSession(w.deps, lid(w));
    expect(b.id).toBe(a.id);
    expect((await getCurrentSession(w.deps, lid(w)))?.id).toBe(a.id);
    expect(w.sessions.rows.size).toBe(1);
  });

  it('is locked until placement is done or skipped', async () => {
    const w = makeWorld({
      learner: { placement: { state: 'none', finishedAt: null, result: null } },
    });
    expect(await codeOf(startSession(w.deps, lid(w)))).toBe('placement_required');
    const w2 = makeWorld({
      learner: { placement: { state: 'in_progress', finishedAt: null, result: null } },
    });
    expect(await codeOf(startSession(w2.deps, lid(w2)))).toBe('placement_required');
  });

  it('flags that placement is due again after a skip', async () => {
    const w = makeWorld({
      learner: { placement: { state: 'skipped', finishedAt: new Date(), result: null } },
    });
    expect((await startSession(w.deps, lid(w))).placementDue).toBe(true);
  });

  it('hides another learner session', async () => {
    const w = makeWorld();
    const s = await startSession(w.deps, lid(w));
    expect(await codeOf(submitTry(w.deps, uuid(), s.id, { mode: 'silent', listened: false }))).toBe(
      'not_configured',
    );
    const other = makeWorld();
    other.sessions.rows.set(s.id, w.sessions.rows.get(s.id)!);
    expect(
      await codeOf(submitTry(other.deps, lid(other), s.id, { mode: 'silent', listened: false })),
    ).toBe('session_not_found');
  });

  it('fails visibly when the bank has no story', async () => {
    const w = makeWorld({ levels: [15], perLevel: 0 });
    expect(await codeOf(startSession(w.deps, lid(w)))).toBe('no_story_available');
  });
});

describe('read tries', () => {
  it('counts a try and keeps reading until the learner continues', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    const c = await voiceTry(w, 18);
    const after = await submitTry(w.deps, id, s.id, {
      mode: 'voice',
      captureId: c,
      listened: false,
    });
    expect(after.triesUsed).toBe(1);
    expect(after.triesLeft).toBe(4);
    expect(after.next).toBe('read_or_continue');
    expect(after.tries[0]?.wordsRightShare).toBe(0.9);
    expect(after.status).toBe('reading');
  });

  it('does not let a try that stopped early count', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    const c = await voiceTry(w, 8, { completed: false });
    const after = await submitTry(w.deps, id, s.id, {
      mode: 'voice',
      captureId: c,
      listened: false,
    });
    expect(after.next).toBe('read');
    expect(after.tries[0]?.completed).toBe(false);
    expect(await codeOf(continueToQuestions(w.deps, id, s.id))).toBe('no_completed_try');
  });

  it('counts the best finished try when the learner continues', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    const caps = [await voiceTry(w, 14), await voiceTry(w, 19), await voiceTry(w, 16)];
    let v = s;
    for (const c of caps) {
      v = await submitTry(w.deps, id, s.id, { mode: 'voice', captureId: c, listened: false });
    }
    const q = await continueToQuestions(w.deps, id, s.id);
    expect(q.status).toBe('answering');
    expect(q.countedTryId).toBe(v.tries[1]?.id);
    expect(q.questions).toHaveLength(5);
  });

  it('moves to the questions by itself when tries run out, using the best try', async () => {
    const w = makeWorld({ levels: [80] });
    const id = lid(w);
    const s = await startSession(w.deps, id);
    expect(s.triesAllowed).toBe(2);
    await submitTry(w.deps, id, s.id, {
      mode: 'voice',
      captureId: await voiceTry(w, 17),
      listened: false,
    });
    const last = await submitTry(w.deps, id, s.id, {
      mode: 'voice',
      captureId: await voiceTry(w, 12),
      listened: false,
    });
    expect(last.status).toBe('answering');
    expect(last.triesLeft).toBe(0);
    expect(last.countedTryId).toBe(last.tries[0]?.id);
    expect(await codeOf(submitTry(w.deps, id, s.id, { mode: 'silent', listened: false }))).toBe(
      'session_wrong_state',
    );
  });

  it('ends as stopped early when tries run out with no finished try, then offers a new story', async () => {
    const w = makeWorld({ levels: [80] });
    const id = lid(w);
    const s = await startSession(w.deps, id);
    for (let i = 0; i < 2; i++) {
      await submitTry(w.deps, id, s.id, {
        mode: 'voice',
        captureId: await voiceTry(w, 5, { completed: false }),
        listened: false,
      });
    }
    const done = await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false }).catch(
      (e) => e,
    );
    expect(done).toBeInstanceOf(EngineError);
    const state = await startSession(w.deps, id);
    expect(state.status).toBe('reading');
    const rec = [...w.sessions.rows.values()][0]!;
    expect(rec.status).toBe('done');
    expect(rec.result?.outcome).toBe('stopped_early');
    expect(rec.result?.levelAfter).toBe(80);
    const fresh = await newStory(w.deps, id, s.id);
    expect(fresh.id).not.toBe(s.id);
    expect(fresh.level).toBe(80);
    expect(fresh.story.id).not.toBe(s.story.id);
  });

  it('never goes over the tries allowed', async () => {
    const w = makeWorld({ levels: [80] });
    const id = lid(w);
    const s = await startSession(w.deps, id);
    for (let i = 0; i < 2; i++) {
      await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false });
      if (i === 0) continue;
    }
    expect(w.sessions.rows.get(s.id)?.tries).toHaveLength(2);
  });
});

describe('microphone gate and speech seam', () => {
  it('refuses a voice try for a learner without microphone approval', async () => {
    const w = makeWorld({ learner: { micAllowed: false } });
    const id = lid(w);
    const s = await startSession(w.deps, id);
    expect(s.voiceMode).toBe('silent');
    const c = await voiceTry(w, 20);
    expect(
      await codeOf(submitTry(w.deps, id, s.id, { mode: 'voice', captureId: c, listened: false })),
    ).toBe('mic_not_allowed');
    // The capture was not consumed and the learner can still read silently.
    expect(w.analyses.byCapture.has(c)).toBe(true);
    const ok = await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false });
    expect(ok.tries[0]?.wordsRightShare).toBeNull();
  });

  it('rejects a capture that is unknown, used or belongs to someone else', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    w.analyses.add(uuid(), 'someone-elses-capture', analysis(20));
    expect(
      await codeOf(
        submitTry(w.deps, id, s.id, {
          mode: 'voice',
          captureId: 'someone-elses-capture',
          listened: false,
        }),
      ),
    ).toBe('analysis_not_found');
    const c = await voiceTry(w, 20);
    await submitTry(w.deps, id, s.id, { mode: 'voice', captureId: c, listened: false });
    expect(
      await codeOf(submitTry(w.deps, id, s.id, { mode: 'voice', captureId: c, listened: false })),
    ).toBe('analysis_not_found');
  });

  it('does not use a try that needs review for level evidence', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    const c = await voiceTry(w, 20, {
      checks: { conditions: ['overlapping_voices'], review: 'needs_review' },
    });
    await submitTry(w.deps, id, s.id, { mode: 'voice', captureId: c, listened: false });
    await continueToQuestions(w.deps, id, s.id);
    const story = (await w.bank.get(s.story.id))!;
    let last;
    for (const q of story.questions) {
      last = await submitAnswer(w.deps, id, s.id, {
        questionId: q.id,
        chosen: rightChoice(q),
        responseMs: 6000,
        accommodations: [],
      });
    }
    expect(last?.result?.voiceEvidence).toBe(false);
    expect(w.learners.profiles.get(id)?.progress.recentWordsRight).toEqual([]);
  });
});

describe('listen then read', () => {
  it('marks a try supported at low levels and lowers the weight of its answers', async () => {
    const w = makeWorld({ levels: [5] });
    const id = lid(w);
    const s = await startSession(w.deps, id);
    expect(s.listenThenRead).toBe(true);
    await submitTry(w.deps, id, s.id, { mode: 'silent', listened: true });
    await continueToQuestions(w.deps, id, s.id);
    const story = (await w.bank.get(s.story.id))!;
    const q = story.questions[0]!;
    await submitAnswer(w.deps, id, s.id, {
      questionId: q.id,
      chosen: rightChoice(q),
      responseMs: 6000,
      accommodations: [],
    });
    const a = w.sessions.rows.get(s.id)!.answers[0]!;
    expect(a.accommodations).toContain('supported_try');
    expect(a.weight).toBeCloseTo(0.7);
  });

  it('ignores the claim at levels above the maximum', async () => {
    const w = makeWorld({ levels: [15] });
    const id = lid(w);
    const s = await startSession(w.deps, id);
    expect(s.listenThenRead).toBe(false);
    const v = await submitTry(w.deps, id, s.id, { mode: 'silent', listened: true });
    expect(v.tries[0]?.supported).toBe(false);
  });
});

describe('answers are scored on the server', () => {
  async function answering(w: World) {
    const id = lid(w);
    const s = await startSession(w.deps, id);
    await submitTry(w.deps, id, s.id, { mode: 'silent', listened: false });
    await continueToQuestions(w.deps, id, s.id);
    return { id, s, story: (await w.bank.get(s.story.id))! };
  }

  it('scores each type and never sends the key before the answer', async () => {
    const w = makeWorld();
    const { id, s, story } = await answering(w);
    const view = await startSession(w.deps, id);
    expect(JSON.stringify(view)).not.toContain('The evidence sentence');
    expect(view.questions.every((q) => !('key' in q) && !('evidence' in q))).toBe(true);
    const [mc, , , multi, order] = story.questions;
    const send = (q: NonNullable<typeof mc>, chosen: number[]) =>
      submitAnswer(w.deps, id, s.id, {
        questionId: q.id,
        chosen,
        responseMs: 6000,
        accommodations: [],
      });
    expect((await send(mc!, [0])).correct).toBe(true);
    expect((await send(multi!, [1, 0])).correct).toBe(true);
    const wrongOrder = await send(order!, [0, 1, 2]);
    expect(wrongOrder.correct).toBe(false);
    expect(wrongOrder.correctIndexes).toEqual([1, 2, 0]);
    expect(wrongOrder.evidence).toBe('The evidence sentence.');
  });

  it('rejects shapes that are not valid answers', async () => {
    const w = makeWorld();
    const { id, s, story } = await answering(w);
    const [mc, , , multi, order] = story.questions;
    const send = (q: NonNullable<typeof mc>, chosen: number[]) =>
      submitAnswer(w.deps, id, s.id, {
        questionId: q.id,
        chosen,
        responseMs: 6000,
        accommodations: [],
      });
    expect(await codeOf(send(mc!, [0, 1]))).toBe('bad_choice');
    expect(await codeOf(send(mc!, [9]))).toBe('bad_choice');
    expect(await codeOf(send(multi!, [1, 1]))).toBe('bad_choice');
    expect(await codeOf(send(order!, [0, 1]))).toBe('bad_choice');
  });

  it('refuses a second answer, an unknown question and unrecordable accommodations', async () => {
    const w = makeWorld();
    const { id, s, story } = await answering(w);
    const q = story.questions[0]!;
    const body = { questionId: q.id, chosen: [0], responseMs: 6000, accommodations: [] as never[] };
    expect(
      await codeOf(submitAnswer(w.deps, id, s.id, { ...body, accommodations: ['word_tap'] })),
    ).toBe('accommodation_not_allowed');
    expect(
      await codeOf(submitAnswer(w.deps, id, s.id, { ...body, accommodations: ['supported_try'] })),
    ).toBe('accommodation_not_allowed');
    await submitAnswer(w.deps, id, s.id, { ...body, accommodations: ['question_read_aloud'] });
    expect(w.sessions.rows.get(s.id)?.answers[0]?.accommodations).toEqual(['question_read_aloud']);
    expect(await codeOf(submitAnswer(w.deps, id, s.id, body))).toBe('already_answered');
    expect(await codeOf(submitAnswer(w.deps, id, s.id, { ...body, questionId: uuid() }))).toBe(
      'question_not_found',
    );
  });

  it('gives rushed answers less weight', async () => {
    const w = makeWorld();
    const { id, s, story } = await answering(w);
    const q = story.questions[0]!;
    await submitAnswer(w.deps, id, s.id, {
      questionId: q.id,
      chosen: [0],
      responseMs: 100,
      accommodations: [],
    });
    const a = w.sessions.rows.get(s.id)!.answers[0]!;
    expect(a.rushed).toBe(true);
    expect(a.weight).toBeCloseTo(0.3);
  });

  it('refuses answers before the questions are open', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    const story = (await w.bank.get(s.story.id))!;
    expect(
      await codeOf(
        submitAnswer(w.deps, id, s.id, {
          questionId: story.questions[0]!.id,
          chosen: [0],
          responseMs: 5000,
          accommodations: [],
        }),
      ),
    ).toBe('session_wrong_state');
  });

  it('offers the inline Learn link once per quiz', async () => {
    const w = makeWorld();
    const { id, s, story } = await answering(w);
    const [a, b] = story.questions;
    const one = await submitAnswer(w.deps, id, s.id, {
      questionId: a!.id,
      chosen: wrongChoice(a!),
      responseMs: 6000,
      accommodations: [],
    });
    const two = await submitAnswer(w.deps, id, s.id, {
      questionId: b!.id,
      chosen: wrongChoice(b!),
      responseMs: 6000,
      accommodations: [],
    });
    expect(one.offerLearn).toBe(true);
    expect(two.offerLearn).toBe(false);
  });
});

describe('finishing and level movement', () => {
  it('passes when words right and questions meet the rule, and offers no Learn button', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    await submitTry(w.deps, id, s.id, {
      mode: 'voice',
      captureId: await voiceTry(w, 19),
      listened: false,
    });
    await continueToQuestions(w.deps, id, s.id);
    const story = (await w.bank.get(s.story.id))!;
    let last;
    for (const q of story.questions) {
      last = await submitAnswer(w.deps, id, s.id, {
        questionId: q.id,
        chosen: rightChoice(q),
        responseMs: 6000,
        accommodations: [],
      });
    }
    expect(last?.result?.outcome).toBe('passed');
    expect(last?.result?.questionsCorrect).toBe(5);
    expect(last?.result?.learn.onResult).toBe(false);
    expect(last?.result?.voiceEvidence).toBe(true);
    const view = await startSession(w.deps, id);
    expect(view.status).toBe('reading');
    expect(view.id).not.toBe(s.id);
  });

  it('does not pass on words right alone, and offers Learn', async () => {
    const w = makeWorld();
    const id = lid(w);
    const s = await startSession(w.deps, id);
    await submitTry(w.deps, id, s.id, {
      mode: 'voice',
      captureId: await voiceTry(w, 20),
      listened: false,
    });
    await continueToQuestions(w.deps, id, s.id);
    const story = (await w.bank.get(s.story.id))!;
    let last;
    for (const q of story.questions) {
      last = await submitAnswer(w.deps, id, s.id, {
        questionId: q.id,
        chosen: wrongChoice(q),
        responseMs: 6000,
        accommodations: [],
      });
    }
    expect(last?.result?.outcome).toBe('not_passed');
    expect(last?.result?.learn.onResult).toBe(true);
    expect(last?.result?.focusSkill).not.toBeNull();
  });

  it('judges a silent read on the questions alone but never moves up on it', async () => {
    const w = makeWorld();
    const last = await playSilent(w, rightChoice);
    expect(last.result?.outcome).toBe('passed');
    expect(last.result?.voiceEvidence).toBe(false);
    expect(last.result?.moved).toBe('none');
  });

  it('moves up on strong evidence over several stories, with voice', async () => {
    const w = makeWorld({ levels: [15, 16], perLevel: 14 });
    const id = lid(w);
    let moved = false;
    for (let i = 0; i < 6 && !moved; i++) {
      const s = await startSession(w.deps, id);
      await submitTry(w.deps, id, s.id, {
        mode: 'voice',
        captureId: await voiceTry(w, 19),
        listened: false,
      });
      await continueToQuestions(w.deps, id, s.id);
      const story = (await w.bank.get(s.story.id))!;
      for (const q of story.questions) {
        const fb = await submitAnswer(w.deps, id, s.id, {
          questionId: q.id,
          chosen: rightChoice(q),
          responseMs: 6000,
          accommodations: [],
        });
        if (fb.result?.moved === 'up') moved = true;
      }
    }
    expect(moved).toBe(true);
    expect(w.learners.profiles.get(id)?.progress.level).toBe(16);
    expect(w.learners.profiles.get(id)?.progress.passedStories).toBe(0);
  });

  it('moves down on strong evidence of being below the level', async () => {
    const w = makeWorld({ levels: [40], perLevel: 14 });
    const id = lid(w);
    let moved = false;
    for (let i = 0; i < 6 && !moved; i++) {
      const last = await playSilent(w, wrongChoice);
      if (last.result?.moved === 'down') moved = true;
    }
    expect(moved).toBe(true);
    expect(w.learners.profiles.get(id)?.progress.level).toBe(39);
  });

  it('does not move on one story', async () => {
    const w = makeWorld();
    const last = await playSilent(w, rightChoice);
    expect(last.result?.moved).toBe('none');
    expect(last.result?.levelAfter).toBe(15);
  });

  it('picks the next story at the new level from the bank, not repeating recent ones', async () => {
    const w = makeWorld({ levels: [15], perLevel: 3 });
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const s = await startSession(w.deps, lid(w));
      seen.add(s.story.id);
      await submitTry(w.deps, lid(w), s.id, { mode: 'silent', listened: false });
      await continueToQuestions(w.deps, lid(w), s.id);
      const story = (await w.bank.get(s.story.id))!;
      for (const q of story.questions) {
        await submitAnswer(w.deps, lid(w), s.id, {
          questionId: q.id,
          chosen: rightChoice(q),
          responseMs: 6000,
          accommodations: [],
        });
      }
    }
    expect(seen.size).toBe(3);
  });

  it('refuses a new story while the session is not finished', async () => {
    const w = makeWorld();
    const s = await startSession(w.deps, lid(w));
    expect(await codeOf(newStory(w.deps, lid(w), s.id))).toBe('session_wrong_state');
  });
});
