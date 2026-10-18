/**
 * Item calibration and retirement from real answers (docs/PLAN.md section 6.1, BB-45).
 *
 * Question difficulty starts as a guess from the story level and sub-skill (`itemDifficulty`). Once a
 * question has enough answers, we re-estimate its difficulty with the same model the ability update
 * uses, flag questions that do not measure reading well, and suggest new sub-skill offsets.
 *
 * Pure functions only. No AI, no I/O. Thresholds live in `EVIDENCE_RULE.calibration`. Owner: Jhade.
 */
import { EVIDENCE_RULE } from '@basabridge/levels';
import { THETA_MAX, THETA_MIN, pCorrect } from './ability';

const RULE = EVIDENCE_RULE.calibration;
const STEP = 0.01;

/** One answer to a question, with the learner's ability estimate when they answered. */
export interface CalibrationResponse {
  theta: number;
  correct: boolean;
  /** 1 is a normal answer. Rushed or supported answers count for less, as in the ability update. */
  weight?: number;
}

export interface DifficultyEstimate {
  difficulty: number;
  /** Standard error of the estimate. Smaller means more certain. */
  se: number;
  answers: number;
}

export interface EstimateOptions {
  /** Chance of answering correctly by guessing, from `guessFor`. */
  guess: number;
  /** Starting difficulty, from `itemDifficulty`. The estimate is pulled toward it. */
  prior: number;
  discrimination?: number;
}

function logPosterior(
  b: number,
  responses: readonly CalibrationResponse[],
  o: EstimateOptions,
  priorPrecision: number,
): number {
  let lp = -0.5 * priorPrecision * (b - o.prior) ** 2;
  for (const r of responses) {
    const p = pCorrect(r.theta, {
      difficulty: b,
      guess: o.guess,
      discrimination: o.discrimination,
    });
    lp += (r.weight ?? 1) * Math.log(Math.max(r.correct ? p : 1 - p, 1e-9));
  }
  return lp;
}

/**
 * Re-estimate one question's difficulty from its answers. Returns null until it has
 * `EVIDENCE_RULE.calibration.minAnswers` answers, so callers keep using `itemDifficulty`.
 */
export function estimateDifficulty(
  responses: readonly CalibrationResponse[],
  o: EstimateOptions,
): DifficultyEstimate | null {
  if (responses.length < RULE.minAnswers) return null;
  const a = o.discrimination ?? EVIDENCE_RULE.discrimination;
  // One answer at matching ability carries a^2 / 4 information, so the prior is worth `priorWeight` answers.
  const priorPrecision = (RULE.priorWeight * a * a) / 4;

  let best = o.prior;
  let bestLp = -Infinity;
  const steps = Math.round((THETA_MAX - THETA_MIN) / STEP);
  for (let i = 0; i <= steps; i++) {
    const b = THETA_MIN + i * STEP;
    const lp = logPosterior(b, responses, o, priorPrecision);
    if (lp > bestLp) {
      bestLp = lp;
      best = b;
    }
  }

  const h = 0.05;
  const lo = Math.max(THETA_MIN, best - h);
  const hi = Math.min(THETA_MAX, best + h);
  const mid = (lo + hi) / 2;
  const curvature =
    (logPosterior(hi, responses, o, priorPrecision) -
      2 * logPosterior(mid, responses, o, priorPrecision) +
      logPosterior(lo, responses, o, priorPrecision)) /
    ((hi - lo) / 2) ** 2;
  const se = curvature < 0 ? 1 / Math.sqrt(-curvature) : Infinity;

  return { difficulty: Math.round(best * 100) / 100, se, answers: responses.length };
}
