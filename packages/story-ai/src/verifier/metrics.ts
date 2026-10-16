import { SAFETY_CATEGORIES, type SafetyCategory } from './prompt';

export const VERIFICATION_OUTCOMES = [
  'kept',
  'rejected_unsafe',
  'rejected_too_few',
  'invalid_reply',
  'model_call_failed',
] as const;
export type VerificationOutcome = (typeof VERIFICATION_OUTCOMES)[number];

/**
 * One verification, as counts and enums only. No passage, question text, answer key or name, so it
 * is safe to log (golden rule 2). Do not add free-text fields.
 */
export interface VerificationRecord {
  level: number;
  questionsIn: number;
  agreed: number;
  disagreed: number;
  outcome: VerificationOutcome;
  categories: SafetyCategory[];
}

export interface VerificationSummary {
  stories: number;
  questions: number;
  /** Questions the checker disagreed on, out of questions that were checked. */
  disagreementRate: number;
  /** Stories rejected for any reason, out of all stories. */
  rejectionRate: number;
  rejectionsByOutcome: Record<VerificationOutcome, number>;
  categoryCounts: Record<SafetyCategory, number>;
}

const rate = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole);

/**
 * Rates for the evaluation work (BB-21). Stories where the model call failed or the reply was
 * invalid are counted as rejections, but their questions are not counted as checked.
 */
export function summariseVerifications(records: VerificationRecord[]): VerificationSummary {
  const rejectionsByOutcome = Object.fromEntries(
    VERIFICATION_OUTCOMES.map((o) => [o, 0]),
  ) as Record<VerificationOutcome, number>;
  const categoryCounts = Object.fromEntries(SAFETY_CATEGORIES.map((c) => [c, 0])) as Record<
    SafetyCategory,
    number
  >;

  let checked = 0;
  let disagreed = 0;
  let rejected = 0;
  for (const r of records) {
    rejectionsByOutcome[r.outcome] += 1;
    if (r.outcome !== 'kept') rejected += 1;
    if (r.outcome !== 'invalid_reply' && r.outcome !== 'model_call_failed') {
      checked += r.questionsIn;
      disagreed += r.disagreed;
    }
    for (const c of r.categories) categoryCounts[c] += 1;
  }

  return {
    stories: records.length,
    questions: records.reduce((n, r) => n + r.questionsIn, 0),
    disagreementRate: rate(disagreed, checked),
    rejectionRate: rate(rejected, records.length),
    rejectionsByOutcome,
    categoryCounts,
  };
}
