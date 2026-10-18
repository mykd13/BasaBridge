/**
 * Item calibration and retirement from real answers (docs/PLAN.md section 6.1, BB-45).
 *
 * Question difficulty starts as a guess from the story level and sub-skill (`itemDifficulty`). Once a
 * question has enough answers, we re-estimate its difficulty with the same model the ability update
 * uses, flag questions that do not measure reading well, and suggest new sub-skill offsets.
 *
 * Pure functions only. No AI, no I/O. Thresholds live in `EVIDENCE_RULE.calibration`. Owner: Jhade.
 */
import type { SubSkill } from '@basabridge/contracts';
import { EVIDENCE_RULE } from '@basabridge/levels';
import { THETA_MAX, THETA_MIN, levelToTheta, pCorrect } from './ability';

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

export type RetireReason = 'too_easy' | 'too_hard' | 'negative_discrimination';

export interface ItemCheck {
  answers: number;
  /** Whether there were enough answers to judge the question at all. */
  enough: boolean;
  /** Weighted share of answers that were correct. */
  shareCorrect: number;
  /** Share correct beyond what guessing alone would give, from 0 to 1. */
  beyondGuess: number;
  /** Weighted correlation between ability and a correct answer. Null when it cannot be computed. */
  correlation: number | null;
  retire: boolean;
  reasons: RetireReason[];
}

function weightedCorrelation(responses: readonly CalibrationResponse[]): number | null {
  let sw = 0;
  let sx = 0;
  let sy = 0;
  for (const r of responses) {
    const w = r.weight ?? 1;
    sw += w;
    sx += w * r.theta;
    sy += w * (r.correct ? 1 : 0);
  }
  if (!(sw > 0)) return null;
  const mx = sx / sw;
  const my = sy / sw;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (const r of responses) {
    const w = r.weight ?? 1;
    const dx = r.theta - mx;
    const dy = (r.correct ? 1 : 0) - my;
    cov += w * dx * dy;
    vx += w * dx * dx;
    vy += w * dy * dy;
  }
  if (vx <= 0 || vy <= 0) return null;
  return cov / Math.sqrt(vx * vy);
}

/**
 * Should this question leave the story bank? It is retired when nearly everyone gets it right, when
 * almost nobody gets it right beyond guessing, or when stronger readers do no better than weaker ones.
 * Nothing is retired before `EVIDENCE_RULE.calibration.minAnswers` answers.
 */
export function retirementCheck(
  responses: readonly CalibrationResponse[],
  o: { guess: number },
): ItemCheck {
  const totalWeight = responses.reduce((a, r) => a + (r.weight ?? 1), 0);
  const correctWeight = responses.reduce((a, r) => a + (r.correct ? (r.weight ?? 1) : 0), 0);
  const shareCorrect = totalWeight > 0 ? correctWeight / totalWeight : 0;
  const beyondGuess = o.guess < 1 ? Math.max(0, (shareCorrect - o.guess) / (1 - o.guess)) : 0;
  const correlation = weightedCorrelation(responses);
  const enough = responses.length >= RULE.minAnswers;

  const reasons: RetireReason[] = [];
  if (enough) {
    if (shareCorrect >= RULE.tooEasy) reasons.push('too_easy');
    if (beyondGuess <= RULE.tooHard) reasons.push('too_hard');
    if (correlation !== null && correlation <= RULE.minCorrelation) {
      reasons.push('negative_discrimination');
    }
  }
  return {
    answers: responses.length,
    enough,
    shareCorrect,
    beyondGuess,
    correlation,
    retire: reasons.length > 0,
    reasons,
  };
}

/** A question whose difficulty has been re-estimated, with where it sits in the level table. */
export interface CalibratedItem {
  storyLevel: number;
  subskill: SubSkill;
  difficulty: number;
  answers: number;
}

export interface OffsetSuggestion {
  subskill: SubSkill;
  current: number;
  suggested: number;
  /** Calibrated questions the suggestion is based on. */
  items: number;
}

/**
 * Suggest new sub-skill offsets for `EVIDENCE_RULE.subskillOffset`: for each sub-skill, the average
 * of calibrated difficulty minus the story level's difficulty, weighted by answers. A sub-skill with
 * too few calibrated questions keeps its current offset. A person copies the numbers into the rule.
 */
export function suggestSubskillOffsets(items: readonly CalibratedItem[]): OffsetSuggestion[] {
  const offsets = EVIDENCE_RULE.subskillOffset;
  return (Object.keys(offsets) as SubSkill[]).map((subskill) => {
    const current = offsets[subskill];
    const mine = items.filter((i) => i.subskill === subskill && i.answers > 0);
    const weight = mine.reduce((a, i) => a + i.answers, 0);
    if (mine.length < RULE.minItemsPerSubskill || weight <= 0) {
      return { subskill, current, suggested: current, items: mine.length };
    }
    const sum = mine.reduce(
      (a, i) => a + i.answers * (i.difficulty - levelToTheta(i.storyLevel)),
      0,
    );
    return {
      subskill,
      current,
      suggested: Math.round((sum / weight) * 100) / 100,
      items: mine.length,
    };
  });
}
