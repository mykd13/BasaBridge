import { describe, expect, it } from 'vitest';
import {
  bootstrapInterval,
  confusion,
  errorSummary,
  exactAgreement,
  pearson,
  ranks,
  spearman,
  strongDisagreements,
  toBand,
  weightedKappa,
  type BandPair,
  type ScorePair,
} from './validity';

const scores = (app: number[], outside: number[]): ScorePair[] =>
  app.map((a, i) => ({ id: `S${i + 1}`, app: a, outside: outside[i]! }));

const bands = (rows: [number, number][]): BandPair[] =>
  rows.map(([app, outside], i) => ({ id: `S${i + 1}`, app, outside }));

describe('ranks', () => {
  it('gives tied values the average rank', () => {
    expect(ranks([5, 6, 7, 8, 7])).toEqual([1, 2, 3.5, 5, 3.5]);
  });
});

describe('pearson and spearman', () => {
  it('matches the published Spearman value with ties', () => {
    // scipy.stats.spearmanr([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]) gives 0.8207826816681233.
    expect(spearman(scores([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]))).toBeCloseTo(0.8207826816681233, 12);
  });

  it('is 1 for the same order and -1 for the reverse order', () => {
    expect(spearman(scores([1, 2, 3, 4], [10, 40, 90, 160]))).toBeCloseTo(1, 12);
    expect(spearman(scores([1, 2, 3, 4], [9, 7, 3, 1]))).toBeCloseTo(-1, 12);
  });

  it('measures order, not scale, while pearson measures a straight line', () => {
    const pairs = scores([1, 2, 3, 4, 5], [1, 4, 9, 16, 100]);
    expect(spearman(pairs)).toBeCloseTo(1, 12);
    expect(pearson(pairs)!).toBeLessThan(0.9);
  });

  it('is null with fewer than 3 pairs or when a side does not vary', () => {
    expect(spearman(scores([1, 2], [1, 2]))).toBeNull();
    expect(pearson(scores([3, 3, 3], [1, 2, 3]))).toBeNull();
  });
});

describe('errorSummary', () => {
  it('reports bias, mean absolute error and limits of agreement', () => {
    const s = errorSummary(scores([10, 20, 30], [8, 22, 27]))!;
    expect(s.n).toBe(3);
    expect(s.bias).toBeCloseTo(1, 12);
    expect(s.meanAbsoluteError).toBeCloseTo(7 / 3, 12);
    expect(s.sdDifference).toBeCloseTo(Math.sqrt(7), 12);
    expect(s.limits.low).toBeCloseTo(1 - 1.96 * Math.sqrt(7), 12);
    expect(s.limits.high).toBeCloseTo(1 + 1.96 * Math.sqrt(7), 12);
  });

  it('is zero error when both sides agree exactly', () => {
    const s = errorSummary(scores([0.8, 0.9, 0.95], [0.8, 0.9, 0.95]))!;
    expect(s.bias).toBe(0);
    expect(s.meanAbsoluteError).toBe(0);
  });

  it('is null with fewer than 2 pairs', () => {
    expect(errorSummary(scores([1], [1]))).toBeNull();
  });
});

describe('toBand', () => {
  it('puts a value at a cut into the higher band', () => {
    const cuts = [59, 80];
    expect(toBand(58, cuts)).toBe(0);
    expect(toBand(59, cuts)).toBe(1);
    expect(toBand(79, cuts)).toBe(1);
    expect(toBand(80, cuts)).toBe(2);
  });

  it('rejects cuts that are not ascending', () => {
    expect(() => toBand(1, [80, 59])).toThrow();
  });
});

describe('confusion and kappa', () => {
  const sample = bands([
    [0, 0],
    [1, 1],
    [2, 2],
    [0, 1],
  ]);

  it('counts app bands as rows and outside bands as columns', () => {
    expect(confusion(sample, 3)).toEqual([
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it('matches a hand-worked quadratic weighted kappa', () => {
    // Observed weighted agreement 0.9375, chance 0.6875, so kappa = 0.25 / 0.3125 = 0.8.
    expect(weightedKappa(sample, 3)).toBeCloseTo(0.8, 12);
  });

  it('is 1 for full agreement and negative for full reversal', () => {
    expect(
      weightedKappa(
        bands([
          [0, 0],
          [1, 1],
          [2, 2],
        ]),
        3,
      ),
    ).toBeCloseTo(1, 12);
    expect(
      weightedKappa(
        bands([
          [0, 2],
          [1, 1],
          [2, 0],
        ]),
        3,
      )!,
    ).toBeLessThan(0);
  });

  it('penalises a two-band miss more than a one-band miss', () => {
    const base: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [1, 1],
      [0, 0],
      [2, 2],
    ];
    const near = weightedKappa(bands([...base, [1, 0]]), 3)!;
    const far = weightedKappa(bands([...base, [2, 0]]), 3)!;
    expect(far).toBeLessThan(near);
  });

  it('is null when every learner is in one band on both sides', () => {
    expect(
      weightedKappa(
        bands([
          [1, 1],
          [1, 1],
        ]),
        3,
      ),
    ).toBeNull();
    expect(weightedKappa([], 3)).toBeNull();
  });

  it('rejects bands out of range', () => {
    expect(() => confusion(bands([[3, 0]]), 3)).toThrow();
  });

  it('reports exact agreement as a share', () => {
    expect(exactAgreement(sample)).toBeCloseTo(0.75, 12);
  });
});

describe('strongDisagreements', () => {
  it('lists gaps of 2 or more, largest first, with a direction', () => {
    const out = strongDisagreements(
      bands([
        [0, 0],
        [2, 0],
        [0, 2],
        [1, 0],
        [3, 0],
      ]),
    );
    expect(out).toEqual([
      { id: 'S5', app: 3, outside: 0, gap: 3, direction: 'too_high' },
      { id: 'S2', app: 2, outside: 0, gap: 2, direction: 'too_high' },
      { id: 'S3', app: 0, outside: 2, gap: 2, direction: 'too_low' },
    ]);
  });
});

describe('bootstrapInterval', () => {
  const pairs = scores(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11],
  );

  it('gives the same interval for the same seed', () => {
    const a = bootstrapInterval(pairs, spearman, { seed: 1, reps: 500 });
    const b = bootstrapInterval(pairs, spearman, { seed: 1, reps: 500 });
    expect(a).toEqual(b);
  });

  it('contains the point estimate and stays within -1 to 1', () => {
    const point = spearman(pairs)!;
    const ci = bootstrapInterval(pairs, spearman, { reps: 1000 })!;
    expect(ci.low).toBeLessThanOrEqual(point);
    expect(ci.high).toBeGreaterThanOrEqual(point);
    expect(ci.low).toBeGreaterThanOrEqual(-1);
    expect(ci.high).toBeLessThanOrEqual(1);
  });

  it('is null with fewer than 3 items', () => {
    expect(bootstrapInterval(pairs.slice(0, 2), spearman)).toBeNull();
  });
});
