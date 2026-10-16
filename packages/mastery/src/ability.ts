/**
 * Ability model for comprehension (docs/PLAN.md section 6.1, ADR 0003).
 *
 * We keep a probability distribution over a learner's ability on a grid, and update it after each
 * answer. A correct answer to a hard question moves the estimate up more than a correct answer to an
 * easy one, and a lucky guess moves it much less than a real answer because we account for the
 * chance of guessing. The result is a best estimate plus how sure we are, not a bare percentage.
 *
 * Pure functions only. No AI, no I/O. Owner: Jhade (BB-19).
 */
import type { AbilityConfidence, QuestionType, SubSkill } from '@basabridge/contracts';
import { EVIDENCE_RULE, MAX_LEVEL, MIN_LEVEL } from '@basabridge/levels';

export const THETA_MIN = -4;
export const THETA_MAX = 4;
const STEP = 0.1;

/** Ability values the distribution is tracked over, from -4 to +4. */
export const GRID: readonly number[] = Array.from(
  { length: Math.round((THETA_MAX - THETA_MIN) / STEP) + 1 },
  (_, i) => Math.round((THETA_MIN + i * STEP) * 10) / 10,
);

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Level 1 maps to ability -3 and level 100 to +3. */
export function levelToTheta(level: number): number {
  const l = clamp(level, MIN_LEVEL, MAX_LEVEL);
  return -3 + ((l - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * 6;
}

export function thetaToLevel(theta: number): number {
  const level = MIN_LEVEL + ((theta + 3) / 6) * (MAX_LEVEL - MIN_LEVEL);
  return clamp(Math.round(level), MIN_LEVEL, MAX_LEVEL);
}

/** A normalised distribution over GRID, plus how many questions went into it. */
export interface Posterior {
  weights: number[];
  items: number;
}

function normalise(w: number[]): number[] {
  const total = w.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return GRID.map(() => 1 / GRID.length);
  return w.map((x) => x / total);
}

/** Starting belief: a normal curve around `mean` with spread `sd`. */
export function prior(mean: number, sd = 1): Posterior {
  const w = GRID.map((t) => Math.exp(-0.5 * ((t - mean) / sd) ** 2));
  return { weights: normalise(w), items: 0 };
}

export interface ItemEvidence {
  /** Difficulty on the ability scale. Use `itemDifficulty` unless the item has been calibrated. */
  difficulty: number;
  /** Chance of answering correctly by guessing. */
  guess: number;
  correct: boolean;
  /** 1 is a normal answer. Rushed or supported answers count for less. */
  weight?: number;
  /** Defaults to the shared discrimination in `EVIDENCE_RULE`. */
  discrimination?: number;
}

/** Chance that a learner of ability `theta` answers correctly. */
export function pCorrect(
  theta: number,
  item: Pick<ItemEvidence, 'difficulty' | 'guess' | 'discrimination'>,
): number {
  const a = item.discrimination ?? EVIDENCE_RULE.discrimination;
  const s = 1 / (1 + Math.exp(-a * (theta - item.difficulty)));
  return item.guess + (1 - item.guess) * s;
}

/** Update the belief after one answer. */
export function updatePosterior(p: Posterior, e: ItemEvidence): Posterior {
  const w = e.weight ?? 1;
  const next = p.weights.map((prob, i) => {
    const pc = pCorrect(GRID[i] ?? 0, e);
    const like = e.correct ? pc : 1 - pc;
    return prob * Math.pow(Math.max(like, 1e-9), w);
  });
  return { weights: normalise(next), items: p.items + 1 };
}

export function updateAll(p: Posterior, evidence: ItemEvidence[]): Posterior {
  return evidence.reduce(updatePosterior, p);
}

export interface AbilitySummary {
  mean: number;
  sd: number;
  items: number;
  confidence: AbilityConfidence;
}

export function confidenceFromSd(sd: number, items: number): AbilityConfidence {
  if (items === 0) return 'none';
  if (sd < 0.35) return 'steady';
  if (sd < 0.6) return 'building';
  return 'early';
}

export function summarise(p: Posterior): AbilitySummary {
  const mean = p.weights.reduce((a, w, i) => a + w * (GRID[i] ?? 0), 0);
  const variance = p.weights.reduce((a, w, i) => a + w * ((GRID[i] ?? 0) - mean) ** 2, 0);
  const sd = Math.sqrt(variance);
  return { mean, sd, items: p.items, confidence: confidenceFromSd(sd, p.items) };
}

/** Probability that ability is above `threshold`. */
export function probAbove(p: Posterior, threshold: number): number {
  return p.weights.reduce((a, w, i) => ((GRID[i] ?? 0) > threshold ? a + w : a), 0);
}

export function probBelow(p: Posterior, threshold: number): number {
  return p.weights.reduce((a, w, i) => ((GRID[i] ?? 0) < threshold ? a + w : a), 0);
}

/** Starting difficulty for a question before it has been calibrated from real answers. */
export function itemDifficulty(storyLevel: number, subskill?: SubSkill): number {
  const offset = subskill ? EVIDENCE_RULE.subskillOffset[subskill] : 0;
  return levelToTheta(storyLevel) + offset;
}

export function guessFor(type: QuestionType | undefined): number {
  return EVIDENCE_RULE.guess[type ?? 'multiple_choice'];
}

/** Milliseconds under which an answer is too fast to have involved reading the question. */
export function rushedThresholdMs(wordsOnScreen: number): number {
  return EVIDENCE_RULE.rushed.baseMs + EVIDENCE_RULE.rushed.perWordMs * Math.max(0, wordsOnScreen);
}

export function isRushed(responseMs: number, wordsOnScreen: number): boolean {
  return responseMs < rushedThresholdMs(wordsOnScreen);
}

/** Weight for one answer. Rushed answers and answers after a supported try count for less. */
export function evidenceWeight(o: { rushed: boolean; supportedTry: boolean }): number {
  let w = 1;
  if (o.rushed) w *= EVIDENCE_RULE.weight.rushed;
  if (o.supportedTry) w *= EVIDENCE_RULE.weight.supportedTry;
  return w;
}

export interface ReadinessContext {
  /** Answered questions at this level or above that fed the posterior. */
  items: number;
  /** Stories passed at the current level. */
  passedStories: number;
  /** Share of words read right on the last counted tries, newest last. */
  recentWordsRight: number[];
}

export interface Readiness {
  up: boolean;
  down: boolean;
  probAbove: number;
  probBelow: number;
}

/**
 * Should the learner move up or down from `level`?
 * Up needs strong evidence of ability above the level, enough items, enough passes and solid decoding.
 * Down needs strong evidence of ability below it. Otherwise the learner stays.
 */
export function levelReadiness(p: Posterior, level: number, ctx: ReadinessContext): Readiness {
  const here = levelToTheta(level);
  const pa = probAbove(p, here + EVIDENCE_RULE.up.margin);
  const pb = probBelow(p, here - EVIDENCE_RULE.down.margin);
  const lastTwo = ctx.recentWordsRight.slice(-2);
  const decodingOk =
    lastTwo.length >= 2 && lastTwo.every((x) => x >= EVIDENCE_RULE.up.minWordsRight);
  const up =
    level < MAX_LEVEL &&
    pa >= EVIDENCE_RULE.up.probability &&
    ctx.items >= EVIDENCE_RULE.up.minItems &&
    ctx.passedStories >= EVIDENCE_RULE.up.minPasses &&
    decodingOk;
  const down =
    level > MIN_LEVEL &&
    pb >= EVIDENCE_RULE.down.probability &&
    ctx.items >= EVIDENCE_RULE.down.minItems;
  return { up, down: down && !up, probAbove: pa, probBelow: pb };
}
