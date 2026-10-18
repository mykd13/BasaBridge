/** Small numeric helpers shared by the environment checks (BB-70). */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Linear-interpolated percentile, p in 0..1. Zero for an empty list. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = Math.min(Math.max(p, 0), 1) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

export function median(values: number[]): number {
  return percentile(values, 0.5);
}

/** Coefficient of variation: spread relative to the mean. Zero when the mean is zero. */
export function variation(values: number[]): number {
  const m = mean(values);
  if (values.length < 2 || m === 0) return 0;
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance) / Math.abs(m);
}
