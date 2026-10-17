import { describe, expect, it } from 'vitest';
import { GOLD_SET } from './gold/gold-set';
import { SAFETY_SET } from './gold/safety-set';
import { failureCode, goldReplayAdapters } from './gold-replay';
import { gate } from './gate';
import { summarize } from './metrics';
import { EvalRun, NO_COST } from './run';
import { runEval, type EvalAdapters } from './runner';

const reviewed = <T extends { reviewedBy: string | null }>(c: T): T => ({
  ...c,
  reviewedBy: 'test',
  reviewedAt: '2026-10-17',
});

const base = {
  id: 'test',
  startedAt: new Date('2026-10-17T10:00:00Z'),
  gitSha: null,
  levels: [5, 24],
  perLevel: 2,
  includeDrafts: false,
};

describe('runEval with gold replay', () => {
  it('skips draft cases unless asked, and records the run header', async () => {
    const cases = [...GOLD_SET, ...SAFETY_SET];
    const run = await runEval({ ...base, cases, adapters: goldReplayAdapters(cases) });
    expect(EvalRun.parse(run)).toEqual(run);
    expect(run.adapters).toBe('gold-replay');
    expect(run.storyModel).toBeNull();
    expect(run.generated).toHaveLength(4);
    expect(run.labelled).toHaveLength(0);
    expect(run.generated.every((s) => s.checks?.passed)).toBe(true);
  });

  it('runs drafts in a dry run, and the stub verifier fails the gate', async () => {
    const cases = [...GOLD_SET, ...SAFETY_SET];
    const run = await runEval({
      ...base,
      cases,
      includeDrafts: true,
      adapters: goldReplayAdapters(cases),
    });
    expect(run.labelled).toHaveLength(cases.length);
    const v = summarize(run).verifier;
    expect(v.unsafeCatch.rate).toBe(0);
    const result = gate(run, null);
    expect(result.pass).toBe(false);
    expect(result.failures.join(' ')).toContain('Unsafe catch rate 0%');
  });

  it('reports a level with no gold passage as a generation error', async () => {
    const adapters = goldReplayAdapters(GOLD_SET.filter((c) => c.story.level < 11));
    const run = await runEval({ ...base, levels: [24], perLevel: 1, cases: [], adapters });
    expect(run.generated[0]).toMatchObject({
      error: 'No gold passage for level 24.',
      checks: null,
    });
  });
});

describe('runEval with injected adapters', () => {
  const story = GOLD_SET[0]!.story;
  const adapters = (over: Partial<EvalAdapters> = {}): EvalAdapters => ({
    name: 'fake',
    storyModel: 'google/fake',
    verifierModel: 'google/fake-verifier',
    promptVersion: 'v1',
    generate: async () => ({
      ok: true,
      story,
      cost: { usd: 0.01, inputTokens: 10, outputTokens: 20 },
    }),
    check: () => ({ passed: true, failures: [] }),
    verify: async () => ({
      error: null,
      disagreed: [],
      flaggedUnsafe: false,
      cost: { usd: 0.02, inputTokens: 30, outputTokens: 5 },
    }),
    ...over,
  });

  it('adds generation and verification cost per story', async () => {
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [],
      adapters: adapters(),
    });
    expect(run.generated[0]!.cost).toEqual({ usd: 0.03, inputTokens: 40, outputTokens: 25 });
    expect(run.storyModel).toBe('google/fake');
  });

  it('does not verify a story that failed the checks', async () => {
    let calls = 0;
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [],
      adapters: adapters({
        check: () => ({ passed: false, failures: ['too_hard'] }),
        verify: async () => {
          calls += 1;
          return { error: null, disagreed: [], flaggedUnsafe: false, cost: NO_COST };
        },
      }),
    });
    expect(calls).toBe(0);
    expect(run.generated[0]!.verifier).toBeNull();
  });

  it('keeps only a fixed sentence when a call throws, never the error text', async () => {
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [reviewed(GOLD_SET[0]!)],
      adapters: adapters({
        generate: async () => {
          throw new Error('prompt text: Tala has a cat');
        },
        verify: async () => {
          throw new Error('reply text: Tala has a cat');
        },
      }),
    });
    expect(run.generated[0]!.error).toBe('The generation call threw an error.');
    expect(run.labelled[0]!.verifier.error).toBe('The verifier call threw an error.');
    expect(JSON.stringify(run)).not.toContain('prompt text');
    expect(JSON.stringify(run)).not.toContain('reply text');
  });
});

describe('failureCode', () => {
  it('maps the current check reasons to the BB-16 codes', () => {
    expect(failureCode('The passage had 3 words but must have 5-15.')).toBe('too_short');
    expect(failureCode('The passage had 30 words but must have 5-15.')).toBe('too_long');
    expect(failureCode('The passage was too hard (reading grade 4.0, maximum 2).')).toBe(
      'too_hard',
    );
    expect(failureCode('Only 3 valid questions; need at least 4.')).toBe('too_few_questions');
    expect(failureCode('Something new.')).toBe('other');
  });
});
