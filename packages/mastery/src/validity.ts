/**
 * Agreement statistics for the validity study (docs/research/validity-study.md, BB-77).
 *
 * The study compares BasaBridge's own numbers (ability, placement level, words right, words per
 * minute) with an outside reading assessment. These helpers measure how far the two agree. They
 * are analysis tools only: nothing in the app calls them, and they never decide a level.
 *
 * Each pair carries an opaque study ID, never a name, username or user ID (AGENTS.md, golden
 * rule 2). Band cut points are passed in, not stored here, because they are set with the reading
 * specialist and level numbers live only in `packages/levels` (golden rule 6).
 *
 * Pure functions only. No AI, no I/O. Owner: Jhade (BB-77).
 */

/** One learner's value from the app and from the outside assessment. */
export interface ScorePair {
  /** Pseudonymous study ID from the study register. */
  id: string;
  app: number;
  outside: number;
}

/** One learner's band from the app and from the outside assessment, as indexes from 0. */
export interface BandPair {
  id: string;
  app: number;
  outside: number;
}

export interface Interval {
  low: number;
  high: number;
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Pearson correlation. Null with fewer than 3 pairs or when either side does not vary. */
export function pearson(pairs: readonly ScorePair[]): number | null {
  if (pairs.length < 3) return null;
  const mx = mean(pairs.map((p) => p.app));
  const my = mean(pairs.map((p) => p.outside));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of pairs) {
    const dx = p.app - mx;
    const dy = p.outside - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Ranks from 1, with tied values sharing the average of their ranks. */
export function ranks(xs: readonly number[]): number[] {
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const out = new Array<number>(xs.length);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]!.x === order[start]!.x) end++;
    const avg = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) out[order[k]!.i] = avg;
    start = end + 1;
  }
  return out;
}

/**
 * Spearman rank correlation: do learners come out in the same order on both measures? Works when
 * the two measures use different scales, such as ability against a percent score.
 */
export function spearman(pairs: readonly ScorePair[]): number | null {
  const ra = ranks(pairs.map((p) => p.app));
  const ro = ranks(pairs.map((p) => p.outside));
  return pearson(pairs.map((p, i) => ({ id: p.id, app: ra[i]!, outside: ro[i]! })));
}

/** Small seeded generator, so a bootstrap gives the same interval every run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface BootstrapOptions {
  reps?: number;
  seed?: number;
  /** Coverage of the interval, for example 0.95. */
  level?: number;
}

/**
 * Percentile bootstrap interval for any statistic of the pairs. Resamples learners with
 * replacement. Resamples where the statistic is undefined are skipped. Null when too few resamples
 * give a value.
 */
export function bootstrapInterval<T>(
  items: readonly T[],
  stat: (sample: readonly T[]) => number | null,
  { reps = 2000, seed = 77, level = 0.95 }: BootstrapOptions = {},
): Interval | null {
  if (items.length < 3) return null;
  const rand = mulberry32(seed);
  const values: number[] = [];
  for (let r = 0; r < reps; r++) {
    const sample = Array.from(
      { length: items.length },
      () => items[Math.floor(rand() * items.length)]!,
    );
    const v = stat(sample);
    if (v !== null && Number.isFinite(v)) values.push(v);
  }
  if (values.length < reps / 2) return null;
  values.sort((a, b) => a - b);
  const tail = (1 - level) / 2;
  const at = (q: number) =>
    values[Math.min(values.length - 1, Math.max(0, Math.floor(q * values.length)))]!;
  return { low: at(tail), high: at(1 - tail) };
}

export interface ErrorSummary {
  n: number;
  /** Mean of app minus outside. Positive means the app reads higher. */
  bias: number;
  /** Mean absolute difference. */
  meanAbsoluteError: number;
  /** Sample standard deviation of the differences. */
  sdDifference: number;
  /** Bland-Altman 95% limits of agreement: bias plus or minus 1.96 deviations. */
  limits: Interval;
}

/**
 * Size of the errors when both values are on the same scale, for example words right as a share
 * against the outside word recognition share. Null with fewer than 2 pairs.
 */
export function errorSummary(pairs: readonly ScorePair[]): ErrorSummary | null {
  if (pairs.length < 2) return null;
  const diffs = pairs.map((p) => p.app - p.outside);
  const bias = mean(diffs);
  const sd = Math.sqrt(diffs.reduce((s, d) => s + (d - bias) ** 2, 0) / (diffs.length - 1));
  return {
    n: pairs.length,
    bias,
    meanAbsoluteError: mean(diffs.map(Math.abs)),
    sdDifference: sd,
    limits: { low: bias - 1.96 * sd, high: bias + 1.96 * sd },
  };
}

/**
 * Band index for a value, given ascending cut points. A value at or above `cuts[i]` is in band
 * `i + 1` or higher. Three bands need two cuts.
 */
export function toBand(value: number, cuts: readonly number[]): number {
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i]! < cuts[i - 1]!) throw new Error('Band cuts must be in ascending order');
  }
  let band = 0;
  while (band < cuts.length && value >= cuts[band]!) band++;
  return band;
}

function checkBands(pairs: readonly BandPair[], bands: number): void {
  if (!Number.isInteger(bands) || bands < 2) throw new Error('Need at least 2 bands');
  for (const p of pairs) {
    for (const b of [p.app, p.outside]) {
      if (!Number.isInteger(b) || b < 0 || b >= bands) throw new Error(`Band ${b} is out of range`);
    }
  }
}

/** Counts of learners by app band (rows) and outside band (columns). */
export function confusion(pairs: readonly BandPair[], bands: number): number[][] {
  checkBands(pairs, bands);
  const table = Array.from({ length: bands }, () => new Array<number>(bands).fill(0));
  for (const p of pairs) table[p.app]![p.outside]!++;
  return table;
}

/**
 * Weighted Cohen's kappa for ordered bands. 1 is full agreement, 0 is what chance alone gives.
 * Quadratic weights count a two-band miss as four times worse than a one-band miss. Null when
 * there are no pairs or chance agreement is already total.
 */
export function weightedKappa(
  pairs: readonly BandPair[],
  bands: number,
  weighting: 'quadratic' | 'linear' = 'quadratic',
): number | null {
  if (pairs.length === 0) return null;
  const table = confusion(pairs, bands);
  const n = pairs.length;
  const rowShare = table.map((row) => row.reduce((a, b) => a + b, 0) / n);
  const colShare = table[0]!.map((_, j) => table.reduce((s, row) => s + row[j]!, 0) / n);
  const span = bands - 1;
  const w = (i: number, j: number) =>
    weighting === 'quadratic' ? 1 - ((i - j) / span) ** 2 : 1 - Math.abs(i - j) / span;
  let observed = 0;
  let expected = 0;
  for (let i = 0; i < bands; i++) {
    for (let j = 0; j < bands; j++) {
      observed += w(i, j) * (table[i]![j]! / n);
      expected += w(i, j) * rowShare[i]! * colShare[j]!;
    }
  }
  if (expected >= 1) return null;
  return (observed - expected) / (1 - expected);
}

/** Share of learners whose app band equals their outside band. */
export function exactAgreement(pairs: readonly BandPair[]): number | null {
  if (pairs.length === 0) return null;
  return pairs.filter((p) => p.app === p.outside).length / pairs.length;
}

export interface Disagreement {
  id: string;
  app: number;
  outside: number;
  /** `too_high` means the app placed the learner above the outside measure. */
  direction: 'too_high' | 'too_low';
  gap: number;
}

/**
 * Learners whose bands differ by at least `minGap`, largest gap first. These are the cases the
 * study investigates by hand before any rule, level or question tag is changed.
 */
export function strongDisagreements(pairs: readonly BandPair[], minGap = 2): Disagreement[] {
  return pairs
    .map((p) => ({ ...p, gap: Math.abs(p.app - p.outside) }))
    .filter((p) => p.gap >= minGap)
    .map(({ id, app, outside, gap }) => ({
      id,
      app,
      outside,
      gap,
      direction: app > outside ? ('too_high' as const) : ('too_low' as const),
    }))
    .sort((a, b) => b.gap - a.gap || a.id.localeCompare(b.id));
}
