/**
 * Checks the reading-grade measure against passages that people rated by hand (BB-16).
 * Pure functions on plain data. The only input is passage text, a level and a grade number.
 * No learner data goes through here. See README.md in this folder.
 */
import { TIERS, tierFor } from '@basabridge/levels';
import { readingGrade } from '../checks';

export interface RatedPassage {
  id: string;
  text: string;
  /** The level the passage was written for. Picks the tier and its cap. */
  level: number;
  /** The grade the rater gave the passage. */
  ratedGrade: number;
  /** A role or initials, never a learner name. */
  rater: string;
}

export interface TierGradeReport {
  from: number;
  to: number;
  maxReadingGrade: number;
  /** Hand-rated passages written for this tier. */
  rated: number;
  /** Rater grade is at or under the cap, but the measure is over it, so the check would reject. */
  wronglyRejected: number;
  /** Rater grade is over the cap, but the measure is at or under it, so the check would accept. */
  wronglyAccepted: number;
}

export interface GradeReport {
  count: number;
  /** Mean of |measured - rated|. null when there are no passages. */
  meanAbsoluteError: number | null;
  /** Pearson correlation of measured and rated grades. null with under two passages or no spread. */
  correlation: number | null;
  tiers: TierGradeReport[];
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  xs.forEach((x, i) => {
    const dx = x - mx;
    const dy = (ys[i] as number) - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  });
  return vx === 0 || vy === 0 ? null : cov / Math.sqrt(vx * vy);
}

export function gradeReport(sample: RatedPassage[]): GradeReport {
  const measured = sample.map((p) => readingGrade(p.text));
  const rated = sample.map((p) => p.ratedGrade);
  const tiers: TierGradeReport[] = TIERS.map((t) => ({
    from: t.from,
    to: t.to,
    maxReadingGrade: t.maxReadingGrade,
    rated: 0,
    wronglyRejected: 0,
    wronglyAccepted: 0,
  }));
  sample.forEach((p, i) => {
    const cap = tierFor(p.level).maxReadingGrade;
    const row = tiers.find((t) => p.level >= t.from && p.level <= t.to);
    if (!row) return;
    row.rated++;
    if (p.ratedGrade <= cap && (measured[i] as number) > cap) row.wronglyRejected++;
    if (p.ratedGrade > cap && (measured[i] as number) <= cap) row.wronglyAccepted++;
  });
  return {
    count: sample.length,
    meanAbsoluteError:
      sample.length === 0 ? null : mean(measured.map((m, i) => Math.abs(m - (rated[i] as number)))),
    correlation: pearson(measured, rated),
    tiers,
  };
}

/** Throws a clear error when the sample file has the wrong shape. */
export function parseSample(data: unknown): RatedPassage[] {
  if (!Array.isArray(data)) throw new Error('rated-sample.json must be an array.');
  return data.map((entry: unknown, i) => {
    const e = entry as Record<string, unknown> | null;
    const ok =
      typeof e === 'object' &&
      e !== null &&
      typeof e.id === 'string' &&
      typeof e.text === 'string' &&
      e.text.trim() !== '' &&
      typeof e.level === 'number' &&
      Number.isInteger(e.level) &&
      typeof e.ratedGrade === 'number' &&
      Number.isFinite(e.ratedGrade) &&
      typeof e.rater === 'string' &&
      e.rater.trim() !== '';
    if (!ok) {
      throw new Error(
        `rated-sample.json entry ${i} needs id, text, level (whole number), ratedGrade (number) and rater.`,
      );
    }
    return e as unknown as RatedPassage;
  });
}

const num = (n: number | null, digits = 2) => (n === null ? 'n/a' : n.toFixed(digits));

/** Plain text for the terminal and for pasting into a Linear comment. */
export function formatGradeReport(report: GradeReport): string {
  if (report.count === 0) {
    return 'No hand-rated passages yet. Add entries to src/validation/rated-sample.json.';
  }
  const lines = [
    `Hand-rated passages: ${report.count}`,
    `Mean absolute error: ${num(report.meanAbsoluteError)} grades`,
    `Correlation: ${num(report.correlation)}`,
    '',
    'Levels   Cap   Rated   Wrongly rejected   Wrongly accepted',
  ];
  for (const t of report.tiers) {
    lines.push(
      `${`${t.from}-${t.to}`.padEnd(8)} ${String(t.maxReadingGrade).padEnd(5)} ${String(t.rated).padEnd(7)} ${String(t.wronglyRejected).padEnd(18)} ${t.wronglyAccepted}`,
    );
  }
  return lines.join('\n');
}
