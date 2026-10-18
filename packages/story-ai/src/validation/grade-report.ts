/**
 * Checks the reading-grade measure and the vocabulary check against passages that people rated by
 * hand (BB-16, BB-72).
 * Pure functions on plain data. The only input is passage text, a level and a grade number.
 * No learner data goes through here. See README.md in this folder.
 */
import { TIERS, tierFor } from '@basabridge/levels';
import { readingGrade, vocabularyCheck } from '../checks';

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
  /** Rater grade is at or under the cap, but the vocabulary check would reject. */
  vocabWronglyRejected: number;
  /** Rater grade is over the cap, but the vocabulary check would accept. */
  vocabWronglyAccepted: number;
  /** The reading-grade cap and the vocabulary check give different answers. */
  disagree: number;
  /** Of the passages where they disagree, how many the rater sides with each check. */
  raterSidesWithGrade: number;
  raterSidesWithVocab: number;
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
    vocabWronglyRejected: 0,
    vocabWronglyAccepted: 0,
    disagree: 0,
    raterSidesWithGrade: 0,
    raterSidesWithVocab: 0,
  }));
  sample.forEach((p, i) => {
    const cap = tierFor(p.level).maxReadingGrade;
    const row = tiers.find((t) => p.level >= t.from && p.level <= t.to);
    if (!row) return;
    row.rated++;
    const fits = p.ratedGrade <= cap;
    const gradeOk = (measured[i] as number) <= cap;
    const vocabOk = vocabularyCheck(p.text, p.level).ok;
    if (fits && !gradeOk) row.wronglyRejected++;
    if (!fits && gradeOk) row.wronglyAccepted++;
    if (fits && !vocabOk) row.vocabWronglyRejected++;
    if (!fits && vocabOk) row.vocabWronglyAccepted++;
    if (gradeOk !== vocabOk) {
      row.disagree++;
      if (gradeOk === fits) row.raterSidesWithGrade++;
      else row.raterSidesWithVocab++;
    }
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
    'Reading grade (Flesch-Kincaid cap) and vocabulary (word list) against the rater.',
    'Rejected and accepted count passages the check gets wrong. Disagree: the two checks differ.',
    '',
    'Levels   Cap   Rated   Grade rej/acc   Vocab rej/acc   Disagree   Rater sides grade/vocab',
  ];
  for (const t of report.tiers) {
    lines.push(
      [
        `${t.from}-${t.to}`.padEnd(8),
        String(t.maxReadingGrade).padEnd(5),
        String(t.rated).padEnd(7),
        `${t.wronglyRejected}/${t.wronglyAccepted}`.padEnd(15),
        `${t.vocabWronglyRejected}/${t.vocabWronglyAccepted}`.padEnd(15),
        String(t.disagree).padEnd(10),
        `${t.raterSidesWithGrade}/${t.raterSidesWithVocab}`,
      ].join(' '),
    );
  }
  return lines.join('\n');
}
