import type { TryAnalysis } from '@basabridge/contracts';
import { EVIDENCE_RULE, PASS_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { levelToTheta, prior, summarise, type Posterior } from './ability';
import type { AnswerInput } from './answer-evidence';
import { createMemoryStore, type MemoryAnswer, type MemoryState } from './memory-store';
import { applyStoryResult, type ApplyStoryInput, type MasteryTx, type StoryOutcome } from './store';

const L = 'learner-1';
const S = 'session-1';

const answer = (n: number, over: Partial<AnswerInput> = {}): AnswerInput => ({
  answerId: `a${n}`,
  questionId: `q${n}`,
  skill: 'literal',
  correct: true,
  responseMs: 60_000,
  wordsOnScreen: 15,
  accommodations: [],
  ...over,
});

const countedTry = (wordsRight: number): TryAnalysis => ({
  completed: true,
  lastWordIndex: 19,
  wordsTotal: 20,
  wordsRight,
  seconds: 20,
  wordsPerMinute: 60,
  words: [],
});

const passingAnswers = Array.from({ length: 5 }, (_, n) =>
  answer(n, { correct: n < PASS_RULE.minQuestionsCorrect }),
);

/** Stored answer rows, as BB-36 saves them before mastery runs. */
const rows = (
  sessionId: string,
  storyLevel: number,
  answers: readonly AnswerInput[],
  weight = 1,
): MemoryAnswer[] =>
  answers.map((a) => ({
    learnerId: L,
    sessionId,
    answerId: a.answerId,
    storyLevel,
    rushed: false,
    weight,
  }));

const strongAbove = (level: number): Posterior => ({
  ...prior(levelToTheta(level) + 2, 0.2),
  items: EVIDENCE_RULE.up.minItems,
});

const store = (over: Partial<MemoryState> = {}, failOn?: keyof MasteryTx) =>
  createMemoryStore(
    { learners: { [L]: { level: 40, passes: 0 } }, answers: rows(S, 40, passingAnswers), ...over },
    { failOn },
  );

/** Earlier answers at the level, enough to meet the item gate with this story's five. */
const earlierAtLevel = rows('earlier', 40, passingAnswers);

const upReady = (over: Partial<MemoryState> = {}) =>
  store({
    learners: { [L]: { level: 40, passes: EVIDENCE_RULE.up.minPasses - 1 } },
    ability: {
      [L]: {
        comprehension: { posterior: strongAbove(40), summary: summarise(strongAbove(40)) },
      },
    },
    answers: [...earlierAtLevel, ...rows(S, 40, passingAnswers)],
    countedTries: [{ learnerId: L, sessionId: 'earlier', wordsRightShare: 0.95 }],
    ...over,
  });

const base: ApplyStoryInput = {
  learnerId: L,
  sessionId: S,
  storyLevel: 40,
  countedTry: countedTry(19),
  answers: passingAnswers,
};

async function apply(s: ReturnType<typeof store>, over: Partial<ApplyStoryInput> = {}) {
  const out = await applyStoryResult(s, { ...base, ...over });
  if (!out.applied) throw new Error('expected the story to be applied');
  return out as StoryOutcome;
}

describe('applyStoryResult: answers', () => {
  it('applies every answer to its skill and comprehension and saves each weight', async () => {
    const s = store();
    await apply(s);
    const st = s.state();
    expect(st.ability[L]?.literal?.posterior.items).toBe(5);
    expect(st.ability[L]?.comprehension?.posterior.items).toBe(5);
    expect(st.ability[L]?.vocabulary).toBeUndefined();
    expect(st.answers.filter((a) => a.sessionId === S).map((a) => a.weight)).toEqual([
      1, 1, 1, 1, 1,
    ]);
  });

  it('saves a lower weight for a rushed answer', async () => {
    const answers = [answer(1, { responseMs: 0 })];
    const s = store({ answers: rows(S, 40, answers) });
    await apply(s, { answers });
    const saved = s.state().answers.find((a) => a.answerId === 'a1');
    expect(saved?.rushed).toBe(true);
    expect(saved?.weight).toBeCloseTo(EVIDENCE_RULE.weight.rushed, 10);
  });

  it('commits nothing when an answer is not in this learner session', async () => {
    const s = store({ answers: rows('another-session', 40, passingAnswers) });
    await expect(apply(s)).rejects.toThrow('No such answer');
    expect(s.state().ability[L]).toBeUndefined();
    expect(s.state().decisions).toEqual([]);
  });
});

describe('applyStoryResult: retries', () => {
  it('skips a session that was already applied and writes nothing', async () => {
    const s = store();
    await apply(s);
    const after = s.state();
    const again = await applyStoryResult(s, base);
    expect(again).toEqual({ applied: false });
    expect(s.state()).toEqual(after);
    expect(s.state().learners[L]?.passes).toBe(1);
    expect(s.state().ability[L]?.comprehension?.posterior.items).toBe(5);
  });

  it('applies a different session as usual', async () => {
    const s = store({
      answers: [...rows(S, 40, passingAnswers), ...rows('session-2', 40, passingAnswers)],
    });
    await apply(s);
    await apply(s, { sessionId: 'session-2' });
    expect(s.state().learners[L]?.passes).toBe(2);
  });
});

describe('applyStoryResult: level', () => {
  it('counts a pass, writes the analysis row and no level row when staying', async () => {
    const s = store();
    const out = await apply(s, { countedTry: countedTry(18) });
    expect(out.level.moved).toBe('none');
    expect(s.state().learners[L]).toEqual({ level: 40, passes: 1 });
    const analysis = s.state().decisions.find((d) => d.decision.kind === 'analysis');
    expect(analysis?.decision.evidence.sessionId).toBe(S);
    expect(s.state().decisions.map((d) => d.decision.kind)).not.toContain('level');
  });

  it('moves up, resets passes and writes the level row in one commit', async () => {
    const s = upReady();
    const out = await apply(s);
    expect(out.level.moved).toBe('up');
    expect(s.state().learners[L]).toEqual({ level: 41, passes: 0 });
    const level = s.state().decisions.find((d) => d.decision.kind === 'level');
    expect(level?.decision.evidence).toMatchObject({
      fromLevel: 40,
      toLevel: 41,
      model: 'ability',
      levelItems: 10,
    });
  });

  it('does not move up when only this story counts toward the item gate', async () => {
    const s = upReady({ answers: rows(S, 40, passingAnswers) });
    const out = await apply(s);
    expect(out.level).toMatchObject({ moved: 'none', passed: true });
  });

  it('does not let rushed answers fill the item gate', async () => {
    const rushed = passingAnswers.map((a) => ({ ...a, responseMs: 0 }));
    const s = upReady({
      answers: [
        ...rows('earlier', 40, passingAnswers, EVIDENCE_RULE.weight.rushed),
        ...rows(S, 40, rushed),
      ],
    });
    const out = await apply(s, { answers: rushed });
    expect(out.level.moved).toBe('none');
  });

  it('only counts earlier answers from stories at or above the level', async () => {
    const s = upReady({
      answers: [...rows('earlier', 30, passingAnswers), ...rows(S, 40, passingAnswers)],
    });
    const out = await apply(s);
    expect(out.level.moved).toBe('none');
  });

  it('leaves the level and passes alone for a story with no answers', async () => {
    const s = upReady();
    const out = await apply(s, { answers: [] });
    expect(out.level.moved).toBe('none');
    expect(s.state().learners[L]).toEqual({ level: 40, passes: EVIDENCE_RULE.up.minPasses - 1 });
    expect(s.state().decisions.map((d) => d.decision.kind)).not.toContain('level');
  });

  it('does not demote a learner whose story was passed', async () => {
    const low = prior(levelToTheta(40) - 2, 0.2);
    const s = store({
      answers: [...earlierAtLevel, ...rows(S, 40, passingAnswers)],
      ability: {
        [L]: {
          comprehension: {
            posterior: { ...low, items: EVIDENCE_RULE.down.minItems },
            summary: summarise(low),
          },
        },
      },
    });
    const out = await apply(s);
    expect(out.level).toMatchObject({ passed: true, moved: 'none' });
    expect(s.state().learners[L]?.level).toBe(40);
  });

  it('counts no pass and moves nothing when the story is at another level', async () => {
    const s = upReady({ answers: [...earlierAtLevel, ...rows(S, 10, passingAnswers)] });
    await apply(s, { storyLevel: 10 });
    expect(s.state().learners[L]).toEqual({ level: 40, passes: EVIDENCE_RULE.up.minPasses - 1 });
  });

  it('reads as many earlier tries as the evidence rule needs, less this story', async () => {
    const seen: number[] = [];
    const s = upReady();
    const real = s.transaction.bind(s);
    s.transaction = (fn) =>
      real((tx) =>
        fn({
          ...tx,
          getRecentWordsRight: (id, o) => {
            seen.push(o.limit);
            return tx.getRecentWordsRight(id, o);
          },
        }),
      );
    await apply(s);
    expect(seen).toEqual([EVIDENCE_RULE.up.recentTries - 1]);
  });

  it('ignores an earlier words-right share that is not between 0 and 1', async () => {
    const s = upReady({
      countedTries: [{ learnerId: L, sessionId: 'earlier', wordsRightShare: Number.NaN }],
    });
    const out = await apply(s);
    expect(out.level.moved).toBe('none');
  });

  it('commits nothing when a write fails partway', async () => {
    const s = store({}, 'addDecision');
    await expect(apply(s)).rejects.toThrow('failOn addDecision');
    expect(s.state().learners[L]).toEqual({ level: 40, passes: 0 });
    expect(s.state().ability[L]).toBeUndefined();
    expect(s.state().decisions).toEqual([]);
  });

  it('throws and writes nothing when a stored estimate is invalid', async () => {
    const s = store({
      ability: {
        [L]: {
          literal: { posterior: { weights: [1, 2], items: 3 }, summary: summarise(prior(0)) },
        },
      },
    });
    await expect(apply(s)).rejects.toThrow('literal is invalid');
    expect(s.state().decisions).toEqual([]);
  });
});

describe('applyStoryResult: fading and focus', () => {
  it('saves faded estimates after deciding with the full ones', async () => {
    const s = store();
    const out = await apply(s);
    const saved = s.state().ability[L]?.comprehension;
    expect(saved?.posterior.items).toBe(5);
    expect(saved?.summary.sd).toBeGreaterThan(out.summaries.comprehension.sd);
    expect(saved?.summary.mean).toBeCloseTo(out.summaries.comprehension.mean, 1);
  });

  it('ignores plan rows from other writers when reading the last focus', async () => {
    const s = store({
      answers: [...rows(S, 40, passingAnswers), ...rows('session-2', 40, passingAnswers)],
    });
    await apply(s);
    // A foreign plan row (for example a lesson plan) lands after the focus row.
    await s.transaction((tx) =>
      tx.addDecision(L, {
        kind: 'plan',
        title: 'Lesson plan',
        summary: 'Next lesson chosen.',
        evidence: { to: 'lesson-7' },
      }),
    );
    await apply(s, { sessionId: 'session-2' });
    const focusRows = s
      .state()
      .decisions.filter((d) => d.decision.kind === 'plan' && d.decision.evidence.messageKey);
    expect(focusRows).toHaveLength(1);
  });

  it('writes a focus row only when the focus changes', async () => {
    const s = store({
      answers: [...rows(S, 40, passingAnswers), ...rows('session-2', 40, passingAnswers)],
    });
    await apply(s);
    await apply(s, { sessionId: 'session-2' });
    const plans = s.state().decisions.filter((d) => d.decision.kind === 'plan');
    expect(plans).toHaveLength(1);
    expect(plans[0]?.decision.evidence).toMatchObject({ from: null, to: 'literal' });
  });

  it('uses the three-passes rule and simple estimates under the simple model', async () => {
    const s = store({ learners: { [L]: { level: 40, passes: PASS_RULE.passesToLevelUp - 1 } } });
    const out = await apply(s, { countedTry: countedTry(18), model: 'simple' });
    expect(out.level).toMatchObject({ moved: 'up', model: 'simple' });
    expect(out.focus).toBe('literal');
    expect(s.state().learners[L]).toEqual({ level: 41, passes: 0 });
  });
});
