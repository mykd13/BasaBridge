import type { TryAnalysis } from '@basabridge/contracts';
import { EVIDENCE_RULE, PASS_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { levelToTheta, prior, summarise, type Posterior } from './ability';
import type { AnswerInput } from './answer-evidence';
import { createMemoryStore, type MemoryState } from './memory-store';
import { applyAnswer, applyStoryResult, type MasteryTx } from './store';

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
const strongAbove = (level: number): Posterior => ({
  ...prior(levelToTheta(level) + 2, 0.2),
  items: EVIDENCE_RULE.up.minItems,
});

const store = (over: Partial<MemoryState> = {}, failOn?: keyof MasteryTx) =>
  createMemoryStore({ learners: { [L]: { level: 40, passes: 0 } }, ...over }, { failOn });

describe('applyAnswer', () => {
  it('saves the skill and comprehension estimates and the answer weight', async () => {
    const s = store();
    await applyAnswer(s, { learnerId: L, storyLevel: 40, answer: answer(1) });
    const st = s.state();
    expect(st.ability[L]?.literal?.posterior.items).toBe(1);
    expect(st.ability[L]?.comprehension?.posterior.items).toBe(1);
    expect(st.ability[L]?.vocabulary).toBeUndefined();
    expect(st.answerWeights.a1).toEqual({ rushed: false, weight: 1 });
  });

  it('saves a lower weight for a rushed answer', async () => {
    const s = store();
    await applyAnswer(s, { learnerId: L, storyLevel: 40, answer: answer(1, { responseMs: 0 }) });
    expect(s.state().answerWeights.a1?.weight).toBeCloseTo(EVIDENCE_RULE.weight.rushed, 10);
  });

  it('builds on the stored estimate after each answer', async () => {
    const s = store();
    await applyAnswer(s, { learnerId: L, storyLevel: 40, answer: answer(1) });
    await applyAnswer(s, { learnerId: L, storyLevel: 40, answer: answer(2) });
    expect(s.state().ability[L]?.comprehension?.posterior.items).toBe(2);
  });
});

describe('applyStoryResult', () => {
  it('counts a pass, writes the analysis row and no level row when staying', async () => {
    const s = store();
    const out = await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(18),
      answers: passingAnswers,
    });
    expect(out.level.moved).toBe('none');
    expect(s.state().learners[L]).toEqual({ level: 40, passes: 1 });
    const kinds = s.state().decisions.map((d) => d.decision.kind);
    expect(kinds).toContain('analysis');
    expect(kinds).not.toContain('level');
  });

  it('moves up, resets passes and writes the level row in one commit', async () => {
    const s = store({
      learners: { [L]: { level: 40, passes: EVIDENCE_RULE.up.minPasses - 1 } },
      ability: {
        [L]: {
          comprehension: { posterior: strongAbove(40), summary: summarise(strongAbove(40)) },
        },
      },
      countedTries: [{ learnerId: L, sessionId: 'earlier', wordsRightShare: 0.95 }],
    });
    const out = await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(19),
      answers: passingAnswers,
    });
    expect(out.level.moved).toBe('up');
    expect(s.state().learners[L]).toEqual({ level: 41, passes: 0 });
    const level = s.state().decisions.find((d) => d.decision.kind === 'level');
    expect(level?.decision.evidence).toMatchObject({
      fromLevel: 40,
      toLevel: 41,
      model: 'ability',
    });
  });

  it('commits nothing when a write fails partway', async () => {
    const s = store({}, 'addDecision');
    await expect(
      applyStoryResult(s, {
        learnerId: L,
        sessionId: S,
        storyLevel: 40,
        countedTry: countedTry(18),
        answers: passingAnswers,
      }),
    ).rejects.toThrow('failOn addDecision');
    expect(s.state().learners[L]).toEqual({ level: 40, passes: 0 });
    expect(s.state().decisions).toEqual([]);
  });

  it('writes a focus row only when the focus changes', async () => {
    const s = store();
    for (const a of passingAnswers) {
      await applyAnswer(s, { learnerId: L, storyLevel: 40, answer: a });
    }
    const input = {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(18),
      answers: passingAnswers,
    };
    await applyStoryResult(s, input);
    await applyStoryResult(s, { ...input, sessionId: 'session-2' });
    const plans = s.state().decisions.filter((d) => d.decision.kind === 'plan');
    expect(plans).toHaveLength(1);
    expect(plans[0]?.decision.evidence).toMatchObject({ from: null, to: 'literal' });
  });

  it('uses the three-passes rule and simple estimates under the simple model', async () => {
    const s = store({ learners: { [L]: { level: 40, passes: PASS_RULE.passesToLevelUp - 1 } } });
    const out = await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(18),
      answers: passingAnswers,
      model: 'simple',
    });
    expect(out.level).toMatchObject({ moved: 'up', model: 'simple' });
    expect(out.focus).toBe('literal');
    expect(s.state().learners[L]).toEqual({ level: 41, passes: 0 });
  });
});
