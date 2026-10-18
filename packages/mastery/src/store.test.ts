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

  const upReady = () =>
    store({
      learners: { [L]: { level: 40, passes: EVIDENCE_RULE.up.minPasses - 1 } },
      ability: {
        [L]: {
          comprehension: { posterior: strongAbove(40), summary: summarise(strongAbove(40)) },
        },
      },
      countedTries: [{ learnerId: L, sessionId: 'earlier', wordsRightShare: 0.95 }],
    });

  it('leaves the level and passes alone for a story with no answers', async () => {
    const s = upReady();
    const out = await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(19),
      answers: [],
    });
    expect(out.level.moved).toBe('none');
    expect(s.state().learners[L]).toEqual({ level: 40, passes: EVIDENCE_RULE.up.minPasses - 1 });
    expect(s.state().decisions.map((d) => d.decision.kind)).not.toContain('level');
  });

  it('does not demote a learner whose story was passed', async () => {
    const low = prior(levelToTheta(40) - 2, 0.2);
    const s = store({
      ability: {
        [L]: {
          comprehension: {
            posterior: { ...low, items: EVIDENCE_RULE.down.minItems },
            summary: summarise(low),
          },
        },
      },
    });
    const out = await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(19),
      answers: passingAnswers,
    });
    expect(out.level).toMatchObject({ passed: true, moved: 'none' });
    expect(s.state().learners[L]?.level).toBe(40);
  });

  it('counts no pass and moves nothing when the story is at another level', async () => {
    const s = upReady();
    await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 10,
      countedTry: countedTry(19),
      answers: passingAnswers,
    });
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
    await applyStoryResult(s, {
      learnerId: L,
      sessionId: S,
      storyLevel: 40,
      countedTry: countedTry(19),
      answers: passingAnswers,
    });
    expect(seen).toEqual([EVIDENCE_RULE.up.recentTries - 1]);
  });

  it('ignores plan rows from other writers when reading the last focus', async () => {
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
    // A foreign plan row (for example a lesson plan) lands after the focus row.
    await s.transaction((tx) =>
      tx.addDecision(L, {
        kind: 'plan',
        title: 'Lesson plan',
        summary: 'Next lesson chosen.',
        evidence: { to: 'lesson-7' },
      }),
    );
    await applyStoryResult(s, { ...input, sessionId: 'session-2' });
    const focusRows = s
      .state()
      .decisions.filter((d) => d.decision.kind === 'plan' && d.decision.evidence.messageKey);
    expect(focusRows).toHaveLength(1);
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
