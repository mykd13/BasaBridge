import { describe, expect, it } from 'vitest';
import { compareSummaries } from './compare';
import { evalRun, genSample, healthyRun, labSample } from './fixtures';
import { isAccepted, median, summarize } from './metrics';
import { EvalRun } from './run';

describe('median', () => {
  it('handles empty, odd and even lists', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe('generation metrics', () => {
  const run = evalRun({
    generated: [
      genSample(),
      genSample({ index: 1, checks: { passed: false, failures: ['too_hard'] }, verifier: null }),
      genSample({
        index: 2,
        error: 'The model call failed.',
        title: null,
        text: null,
        words: null,
        readingGrade: null,
        questions: null,
        checks: null,
        verifier: null,
      }),
      genSample({ index: 3, verifier: { error: null, disagreed: [], flaggedUnsafe: true } }),
      genSample({ level: 60, words: 100, readingGrade: 5 }),
    ],
  });
  const g = summarize(run).generation;

  it('counts the check pass rate over every attempt', () => {
    expect(g.attempted).toBe(5);
    expect(g.generated).toBe(4);
    expect(g.checkPassRate).toEqual({ part: 3, whole: 5, rate: 0.6 });
  });

  it('counts failure codes, with generation errors as their own code', () => {
    expect(g.failures).toEqual({ too_hard: 1, generation_error: 1 });
  });

  it('counts unsafe flags and accepted stories', () => {
    expect(g.flaggedUnsafe).toBe(1);
    expect(g.accepted).toBe(2);
  });

  it('splits the pass rate by tier and leaves out empty tiers', () => {
    expect(g.perTier.map((t) => [t.from, t.checkPassRate.part, t.checkPassRate.whole])).toEqual([
      [11, 2, 4],
      [56, 1, 1],
    ]);
  });
});

describe('isAccepted', () => {
  it('needs four questions left after the verifier drops some', () => {
    const v = (disagreed: number[]) => ({ error: null, disagreed, flaggedUnsafe: false });
    expect(isAccepted(genSample({ verifier: v([1]) }))).toBe(true);
    expect(isAccepted(genSample({ verifier: v([1, 2]) }))).toBe(false);
  });

  it('rejects a story whose verifier call failed', () => {
    const verifier = { error: 'The verifier call failed.', disagreed: [], flaggedUnsafe: false };
    expect(isAccepted(genSample({ verifier }))).toBe(false);
  });
});

describe('difficulty drift', () => {
  it('reports medians and stories outside the tier for each level', () => {
    const run = evalRun({
      generated: [
        genSample({ words: 30, readingGrade: 2 }),
        genSample({ words: 40, readingGrade: 3 }),
        genSample({ words: 60, readingGrade: 4 }),
      ],
    });
    expect(summarize(run).drift).toEqual([
      {
        level: 24,
        stories: 3,
        medianWords: 40,
        medianGrade: 3,
        wordRange: { min: 25, max: 50 },
        maxReadingGrade: 3.5,
        outOfRange: 1,
        overCap: 1,
      },
    ]);
  });
});

describe('verifier agreement', () => {
  it('measures catch and false alarm rates on labelled cases', () => {
    const run = evalRun({
      labelled: [
        labSample({
          wrongKeys: [2, 3],
          verifier: { error: null, disagreed: [2, 5], flaggedUnsafe: false },
        }),
        labSample({
          set: 'safety',
          unsafe: true,
          verifier: { error: null, disagreed: [], flaggedUnsafe: true },
        }),
        labSample({ set: 'safety', unsafe: true }),
        labSample({ verifier: { error: null, disagreed: [], flaggedUnsafe: true } }),
      ],
    });
    const v = summarize(run).verifier;
    expect(v.wrongKeyCatch).toEqual({ part: 1, whole: 2, rate: 0.5 });
    expect(v.goodKeyFalseAlarm).toEqual({ part: 1, whole: 8, rate: 0.125 });
    expect(v.unsafeCatch).toEqual({ part: 1, whole: 2, rate: 0.5 });
    expect(v.safeFalseAlarm).toEqual({ part: 1, whole: 2, rate: 0.5 });
  });

  it('leaves unreviewed cases out unless the run includes drafts', () => {
    const labelled = [labSample(), labSample({ caseId: 'draft', reviewed: false })];
    expect(summarize(evalRun({ labelled })).verifier.gold).toBe(1);
    expect(summarize(evalRun({ labelled, includesDrafts: true })).verifier.gold).toBe(2);
  });

  it('reports no rate when there is nothing to measure', () => {
    expect(summarize(evalRun()).verifier.unsafeCatch.rate).toBeNull();
  });
});

describe('cost', () => {
  it('totals priced calls and reports per story and per accepted story', () => {
    const run = evalRun({
      generated: [
        genSample(),
        genSample({ index: 1, checks: { passed: false, failures: ['too_long'] }, verifier: null }),
      ],
      labelled: [labSample()],
    });
    const c = summarize(run).cost;
    expect(c.usd).toBeCloseTo(0.025);
    expect(c.inputTokens).toBe(250);
    expect(c.perStoryUsd).toBeCloseTo(0.01);
    expect(c.perAcceptedStoryUsd).toBeCloseTo(0.02);
  });

  it('gives no per story price when any generated story is unpriced', () => {
    const run = evalRun({
      generated: [genSample(), genSample({ cost: { usd: null, inputTokens: 1, outputTokens: 1 } })],
    });
    const c = summarize(run).cost;
    expect(c.unpriced).toBe(1);
    expect(c.perStoryUsd).toBeNull();
  });
});

describe('compareSummaries', () => {
  it('reports changes for shared levels and rates', () => {
    const baseline = summarize(healthyRun());
    const candidate = summarize(
      healthyRun({
        generated: [genSample({ readingGrade: 3 }), genSample({ index: 1, readingGrade: 4 })],
      }),
    );
    const cmp = compareSummaries(baseline, candidate);
    expect(cmp.levels).toEqual([
      {
        level: 24,
        medianGrade: { baseline: 2.5, candidate: 3.5, change: 1 },
        medianWords: { baseline: 40, candidate: 40, change: 0 },
      },
    ]);
    expect(cmp.unsafeCatch).toEqual({ baseline: 1, candidate: 1, change: 0 });
  });
});

describe('privacy', () => {
  it('a run record has no field for keys, names, usernames or audio', () => {
    const keys = new Set<string>();
    const walk = (x: unknown) => {
      if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === 'object') {
        for (const [k, v] of Object.entries(x)) {
          keys.add(k.toLowerCase());
          walk(v);
        }
      }
    };
    walk(EvalRun.parse(healthyRun()));
    for (const forbidden of ['apikey', 'key', 'name', 'username', 'audio', 'email']) {
      expect(keys.has(forbidden), forbidden).toBe(false);
    }
    expect(Object.keys(EvalRun.shape)).not.toContain('apiKey');
  });
});
