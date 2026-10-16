/** Small statistics helpers for the bake-off report. */

export function mean(xs: number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Percentile with linear interpolation. p in 0..100. */
export function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = ((s.length - 1) * p) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/**
 * Area under the ROC curve for a score that should be higher on positives.
 * 1 is perfect, 0.5 is chance. Ties count half. Null when either class is empty.
 */
export function auroc(scores: number[], positive: boolean[]): number | null {
  const pos = scores.filter((_, i) => positive[i]);
  const neg = scores.filter((_, i) => !positive[i]);
  if (pos.length === 0 || neg.length === 0) return null;
  const ranked = scores.map((s, i) => ({ s, p: positive[i]! })).sort((a, b) => a.s - b.s);
  // Average ranks for ties (Mann-Whitney U).
  let rankSumPos = 0;
  let k = 0;
  while (k < ranked.length) {
    let end = k;
    while (end + 1 < ranked.length && ranked[end + 1]!.s === ranked[k]!.s) end++;
    const avgRank = (k + end) / 2 + 1;
    for (let t = k; t <= end; t++) if (ranked[t]!.p) rankSumPos += avgRank;
    k = end + 1;
  }
  const u = rankSumPos - (pos.length * (pos.length + 1)) / 2;
  return u / (pos.length * neg.length);
}

/** Deterministic random numbers so the report is reproducible (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 95% interval for a ratio of sums, resampling whole clusters (readers) with replacement.
 * Each cluster contributes [numerator, denominator]. Readers are the unit because one
 * child's recordings are not independent of each other.
 */
export function clusterBootstrapRatio(
  clusters: Array<[number, number]>,
  iterations = 1000,
  seed = 22,
): [number, number] | null {
  if (clusters.length < 2) return null;
  const rand = seededRandom(seed);
  const ratios: number[] = [];
  for (let it = 0; it < iterations; it++) {
    let num = 0;
    let den = 0;
    for (let c = 0; c < clusters.length; c++) {
      const pick = clusters[Math.floor(rand() * clusters.length)]!;
      num += pick[0];
      den += pick[1];
    }
    if (den > 0) ratios.push(num / den);
  }
  const lo = percentile(ratios, 2.5);
  const hi = percentile(ratios, 97.5);
  return lo === null || hi === null ? null : [lo, hi];
}

/** Cohen's kappa for two raters giving binary labels. */
export function cohenKappa(a: boolean[], b: boolean[]): number | null {
  const n = a.length;
  if (n === 0 || n !== b.length) return null;
  let agree = 0;
  let aYes = 0;
  let bYes = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    if (a[i]) aYes++;
    if (b[i]) bYes++;
  }
  const po = agree / n;
  const pe = (aYes / n) * (bYes / n) + (1 - aYes / n) * (1 - bYes / n);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}
