import { describe, expect, it } from 'vitest';
import { GOLD_SET } from './gold/gold-set';
import { SAFETY_SET } from './gold/safety-set';
import { checkStory } from '../index';
import { checkWithCurrentRules, goldReplayAdapters } from './gold-replay';
import { gate } from './gate';
import { summarize } from './metrics';
import { ErrorCode, EvalRun, UNPRICED, VerifierResult } from './run';
import { formatSummary } from './report';
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
    // Unreviewed drafts are not replayed as "generated" stories, so nothing is passed off as a result.
    expect(run.generated.every((s) => s.error === 'no_gold_passage')).toBe(true);
  });

  it('replays drafts as stories only in a dry run that includes drafts', async () => {
    const cases = [...GOLD_SET, ...SAFETY_SET];
    const run = await runEval({
      ...base,
      cases,
      includeDrafts: true,
      adapters: goldReplayAdapters(cases, true),
    });
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
      error: 'no_gold_passage',
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
          return { error: null, disagreed: [], flaggedUnsafe: false, cost: UNPRICED };
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
    expect(run.generated[0]!.error).toBe('call_failed');
    expect(run.labelled[0]!.verifier.error).toBe('call_failed');
    // A thrown call may have been billed, so its price is unknown, not zero.
    expect(run.generated[0]!.cost.usd).toBeNull();
    expect(run.labelled[0]!.cost.usd).toBeNull();
    expect(JSON.stringify(run)).not.toContain('prompt text');
    expect(JSON.stringify(run)).not.toContain('reply text');
  });
});

describe('runEval at the adapter boundary', () => {
  const story = GOLD_SET[0]!.story;
  const adapters = (over: Partial<EvalAdapters> = {}): EvalAdapters => ({
    name: 'fake',
    storyModel: null,
    verifierModel: null,
    promptVersion: null,
    generate: async () => ({ ok: true, story, cost: UNPRICED }),
    check: () => ({ passed: true, failures: [] }),
    verify: async () => ({ error: null, disagreed: [], flaggedUnsafe: false, cost: UNPRICED }),
    ...over,
  });

  it('counts a story that does not parse as an invalid reply', async () => {
    const bad = { title: 'x', text: 'y', level: 5, questions: [] } as never;
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [],
      adapters: adapters({ generate: async () => ({ ok: true, story: bad, cost: UNPRICED }) }),
    });
    expect(run.generated[0]).toMatchObject({ error: 'invalid_reply', checks: null, text: null });
    expect(summarize(run).generation.failures).toEqual({ generation_error: 1 });
  });

  it('checks and reports a story at the level that was asked for', async () => {
    const seen: number[] = [];
    const run = await runEval({
      ...base,
      levels: [24],
      perLevel: 1,
      cases: [],
      adapters: adapters({
        check: (s) => {
          seen.push(s.level);
          return { passed: true, failures: [] };
        },
      }),
    });
    expect(seen).toEqual([24]);
    expect(run.generated[0]!.level).toBe(24);
  });

  it('turns a verifier reply with free text in error into an invalid reply', async () => {
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [],
      adapters: adapters({
        verify: async () =>
          ({
            error: 'provider said: Tala has a cat',
            disagreed: [],
            flaggedUnsafe: false,
            cost: UNPRICED,
          }) as never,
      }),
    });
    expect(run.generated[0]!.verifier!.error).toBe('invalid_reply');
    expect(JSON.stringify(run)).not.toContain('provider said');
  });

  it('turns a generation failure with free text in error into an invalid reply', async () => {
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [],
      adapters: adapters({
        generate: async () =>
          ({ ok: false, error: 'provider said: Tala has a cat', cost: UNPRICED }) as never,
      }),
    });
    expect(run.generated[0]!.error).toBe('invalid_reply');
    expect(JSON.stringify(run)).not.toContain('provider said');
  });

  it('keeps a known failure code from the adapter', async () => {
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [],
      adapters: adapters({
        generate: async () => ({ ok: false, error: 'timeout', cost: UNPRICED }),
      }),
    });
    expect(run.generated[0]!.error).toBe('timeout');
  });

  it('records a cost that does not parse as unknown, not as a number', async () => {
    const badCost = { usd: -1, inputTokens: 1.5, outputTokens: 'many' } as never;
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases: [reviewed(GOLD_SET[0]!)],
      adapters: adapters({
        generate: async () => ({ ok: true, story, cost: badCost }),
        verify: async () => ({ error: null, disagreed: [], flaggedUnsafe: false, cost: badCost }),
      }),
    });
    expect(run.generated[0]!.cost).toEqual(UNPRICED);
    expect(run.labelled[0]!.cost).toEqual(UNPRICED);
    // The run must still be a valid stored run.
    expect(EvalRun.safeParse(run).success).toBe(true);
  });

  it('rejects an error string that is not a known code', () => {
    expect(ErrorCode.safeParse('call_failed').success).toBe(true);
    expect(ErrorCode.safeParse('provider said: Tala has a cat').success).toBe(false);
    expect(
      VerifierResult.safeParse({ error: 'free text', disagreed: [], flaggedUnsafe: false }).success,
    ).toBe(false);
  });
});

describe('gold replay', () => {
  it('records no price, so the report says n/a instead of $0', async () => {
    const cases = [reviewed(GOLD_SET[0]!)];
    const run = await runEval({
      ...base,
      levels: [5],
      perLevel: 1,
      cases,
      adapters: goldReplayAdapters(cases),
    });
    const s = summarize(run);
    expect(s.cost.usd).toBeNull();
    expect(s.cost.perStoryUsd).toBeNull();
    const text = formatSummary(run, s);
    expect(text).toMatch(/Per story\s+n\/a/);
    expect(text).toContain('No model was called. These numbers say nothing about a model.');
  });

  it('replays only reviewed passages unless drafts are included', async () => {
    const request = { level: 5, index: 0 };
    const drafts = await goldReplayAdapters(GOLD_SET).generate(request);
    expect(drafts).toMatchObject({ ok: false, error: 'no_gold_passage' });
    const withDrafts = await goldReplayAdapters(GOLD_SET, true).generate(request);
    expect(withDrafts.ok).toBe(true);
    const reviewedOne = await goldReplayAdapters(GOLD_SET.map(reviewed)).generate(request);
    expect(reviewedOne.ok).toBe(true);
  });
});

describe('checkWithCurrentRules', () => {
  const goodQuestions = GOLD_SET[0]!.story.questions;
  // Level 5 allows 5-15 words and grade 2. Level 24 allows 25-50 words.
  const words = (n: number) => Array.from({ length: n }, () => 'cat').join(' ') + '.';
  const hard =
    'Extraordinarily complicated international organizations unquestionably necessitate comprehensive administrative infrastructure.';

  it('maps what checkStory really returns, so a change in the checks breaks this test', () => {
    const cases: [string, ReturnType<typeof checkStory>][] = [
      ['too_short', checkStory(words(2), goodQuestions, 5)],
      ['too_long', checkStory(words(60), goodQuestions, 5)],
      ['too_hard', checkStory(hard, goodQuestions, 5)],
      ['too_few_questions', checkStory(GOLD_SET[0]!.story.text, goodQuestions.slice(0, 2), 5)],
    ];
    for (const [code, result] of cases) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.failures.map((f) => f.code)).toContain(code);
    }
  });

  it('uses the real checks and their codes', () => {
    const story = { ...GOLD_SET[0]!.story, text: words(2) };
    const out = checkWithCurrentRules(story);
    expect(out.passed).toBe(false);
    expect(out.failures).toContain('too_short');
  });
});
