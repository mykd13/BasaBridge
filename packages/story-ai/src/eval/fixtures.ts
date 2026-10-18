/** Builders for tests. Hand-made numbers that say nothing about any real model. */
import type { EvalRun, GeneratedSample, LabelledSample } from './run';

export const genSample = (over: Partial<GeneratedSample> = {}): GeneratedSample => ({
  level: 24,
  index: 0,
  error: null,
  title: 'A test story',
  text: 'Text.',
  words: 40,
  readingGrade: 2,
  questions: 5,
  checks: { passed: true, failures: [] },
  verifier: { error: null, disagreed: [], flaggedUnsafe: false },
  cost: { usd: 0.01, inputTokens: 100, outputTokens: 200 },
  ...over,
});

export const labSample = (over: Partial<LabelledSample> = {}): LabelledSample => ({
  caseId: 'gold-test',
  set: 'gold',
  level: 24,
  questions: 5,
  wrongKeys: [],
  unsafe: false,
  reviewed: true,
  checks: { passed: true, failures: [] },
  verifier: { error: null, disagreed: [], flaggedUnsafe: false },
  cost: { usd: 0.005, inputTokens: 50, outputTokens: 20 },
  ...over,
});

export const evalRun = (over: Partial<EvalRun> = {}): EvalRun => ({
  id: 'test-run',
  startedAt: '2026-10-17T10:00:00.000Z',
  gitSha: 'abc1234',
  adapters: 'test',
  storyModel: 'google/test-story',
  verifierModel: 'google/test-verifier',
  promptVersion: 'v1',
  includesDrafts: false,
  generated: [],
  labelled: [],
  ...over,
});

/** A run that should pass every gate: good stories, a verifier that catches everything. */
export const healthyRun = (over: Partial<EvalRun> = {}): EvalRun =>
  evalRun({
    generated: [genSample(), genSample({ index: 1, readingGrade: 3 })],
    labelled: [
      labSample({ caseId: 'gold-a' }),
      labSample({
        caseId: 'gold-a-wrong-2',
        wrongKeys: [2],
        verifier: { error: null, disagreed: [2], flaggedUnsafe: false },
      }),
      labSample({
        caseId: 'safety-a',
        set: 'safety',
        unsafe: true,
        verifier: { error: null, disagreed: [], flaggedUnsafe: true },
      }),
    ],
    ...over,
  });

/** Like healthyRun, but with enough planted wrong keys and unsafe passages to meet the minimums. */
export const fullHealthyRun = (over: Partial<EvalRun> = {}): EvalRun => {
  const base = healthyRun();
  const wrong = Array.from({ length: 3 }, (_, i) =>
    labSample({
      caseId: `gold-b-wrong-${i}`,
      wrongKeys: [i + 1],
      verifier: { error: null, disagreed: [i + 1], flaggedUnsafe: false },
    }),
  );
  const unsafe = Array.from({ length: 9 }, (_, i) =>
    labSample({
      caseId: `safety-b-${i}`,
      set: 'safety',
      unsafe: true,
      verifier: { error: null, disagreed: [], flaggedUnsafe: true },
    }),
  );
  return { ...base, labelled: [...base.labelled, ...wrong, ...unsafe], ...over };
};
