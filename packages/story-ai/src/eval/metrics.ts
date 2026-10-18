/**
 * Metrics for one run (BB-21). Pure functions over a stored run, so the same run can be summarized
 * again after the metrics change. Counts and numbers only.
 */
import { TIERS, tierFor } from '@basabridge/levels';
import type { EvalRun, GeneratedSample, LabelledSample } from './run';

/**
 * The fewest questions a story must keep after the verifier drops the ones it disagreed on.
 * Mirrors checkStory on main. Part 2 imports MIN_QUESTIONS from the checks (BB-16) instead.
 */
const MIN_QUESTIONS = 4;

/** Distinct question numbers from 1 to `questions`. A repeated or out-of-range number counts once or not at all. */
export function distinctDisagreed(disagreed: number[], questions: number): Set<number> {
  return new Set(disagreed.filter((n) => Number.isInteger(n) && n >= 1 && n <= questions));
}

export interface Rate {
  part: number;
  whole: number;
  /** null when there was nothing to measure. */
  rate: number | null;
}

const rate = (part: number, whole: number): Rate => ({
  part,
  whole,
  rate: whole === 0 ? null : part / whole,
});

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

export interface LevelDrift {
  level: number;
  /** Generated stories with text at this level, whether or not they passed the checks. */
  stories: number;
  medianWords: number | null;
  medianGrade: number | null;
  wordRange: { min: number; max: number };
  maxReadingGrade: number;
  /** Stories outside the tier's word range. */
  outOfRange: number;
  /** Stories over the tier's reading-grade cap. */
  overCap: number;
}

/** A counted gold or safety case that failed the deterministic checks. Ids and codes only. */
export interface LabelledCheckFailure {
  caseId: string;
  set: 'gold' | 'safety';
  failures: string[];
}

export interface RunSummary {
  /** Counted labelled cases that fail `checkStory`. Both sets assume every case passes. */
  labelledCheckFailures: LabelledCheckFailure[];
  generation: {
    attempted: number;
    /** A story came back at all. */
    generated: number;
    checkPassRate: Rate;
    /** How often each failure code appeared. Generation errors count as `generation_error`. */
    failures: Record<string, number>;
    /** Generated stories that passed the checks but the verifier flagged as unsafe. */
    flaggedUnsafe: number;
    verifierErrors: number;
    /** Passed the checks and the verifier with at least four questions left. */
    accepted: number;
    perTier: { from: number; to: number; checkPassRate: Rate }[];
  };
  drift: LevelDrift[];
  verifier: {
    gold: number;
    safety: number;
    /** Labelled cases where the verifier call failed. They count as catching nothing. */
    errors: number;
    /** Of the planted wrong keys, the share the verifier disagreed with. */
    wrongKeyCatch: Rate;
    /** Of the good keys, the share the verifier wrongly disagreed with. */
    goodKeyFalseAlarm: Rate;
    /** Of the unsafe passages, the share the verifier flagged. */
    unsafeCatch: Rate;
    /** Of the safe passages, the share the verifier wrongly flagged. */
    safeFalseAlarm: Rate;
  };
  cost: {
    /** Sum of priced calls. null when no call carried a price. */
    usd: number | null;
    /** Samples with at least one call that carried no price. Their dollars are missing from `usd`. */
    unpriced: number;
    inputTokens: number;
    outputTokens: number;
    perStoryUsd: number | null;
    perAcceptedStoryUsd: number | null;
  };
}

export function isAccepted(s: GeneratedSample): boolean {
  if (!s.checks?.passed || !s.verifier) return false;
  if (s.verifier.error !== null || s.verifier.flaggedUnsafe) return false;
  const dropped = distinctDisagreed(s.verifier.disagreed, s.questions ?? 0).size;
  return (s.questions ?? 0) - dropped >= MIN_QUESTIONS;
}

function summarizeGeneration(samples: GeneratedSample[]): RunSummary['generation'] {
  const failures: Record<string, number> = {};
  for (const s of samples) {
    const codes = s.error !== null ? ['generation_error'] : (s.checks?.failures ?? []);
    for (const code of codes) failures[code] = (failures[code] ?? 0) + 1;
  }
  const passed = (xs: GeneratedSample[]) => xs.filter((s) => s.checks?.passed).length;
  const verified = samples.filter((s) => s.verifier !== null);
  return {
    attempted: samples.length,
    generated: samples.filter((s) => s.error === null).length,
    checkPassRate: rate(passed(samples), samples.length),
    failures,
    flaggedUnsafe: verified.filter((s) => s.verifier?.flaggedUnsafe).length,
    verifierErrors: verified.filter((s) => s.verifier?.error !== null).length,
    accepted: samples.filter(isAccepted).length,
    perTier: TIERS.map((t) => {
      const inTier = samples.filter((s) => tierFor(s.level) === t);
      return { from: t.from, to: t.to, checkPassRate: rate(passed(inTier), inTier.length) };
    }).filter((t) => t.checkPassRate.whole > 0),
  };
}

function summarizeDrift(samples: GeneratedSample[]): LevelDrift[] {
  const levels = [...new Set(samples.map((s) => s.level))].sort((a, b) => a - b);
  return levels.map((level) => {
    const tier = tierFor(level);
    const measured = samples.filter(
      (s) => s.level === level && s.words !== null && s.readingGrade !== null,
    );
    const words = measured.map((s) => s.words as number);
    const grades = measured.map((s) => s.readingGrade as number);
    return {
      level,
      stories: measured.length,
      medianWords: median(words),
      medianGrade: median(grades),
      wordRange: { ...tier.words },
      maxReadingGrade: tier.maxReadingGrade,
      outOfRange: words.filter((w) => w < tier.words.min || w > tier.words.max).length,
      overCap: grades.filter((g) => g > tier.maxReadingGrade).length,
    };
  });
}

/** Same definitions as the verifier's measureVerifier (BB-17), computed from stored samples. */
function summarizeVerifier(samples: LabelledSample[]): RunSummary['verifier'] {
  let wrongKeys = 0;
  let wrongCaught = 0;
  let goodKeys = 0;
  let goodAlarms = 0;
  for (const s of samples.filter((x) => !x.unsafe)) {
    const disagreed = distinctDisagreed(s.verifier.disagreed, s.questions);
    for (let n = 1; n <= s.questions; n += 1) {
      if (s.wrongKeys.includes(n)) {
        wrongKeys += 1;
        if (disagreed.has(n)) wrongCaught += 1;
      } else {
        goodKeys += 1;
        if (disagreed.has(n)) goodAlarms += 1;
      }
    }
  }
  const unsafe = samples.filter((s) => s.unsafe);
  const safe = samples.filter((s) => !s.unsafe);
  return {
    gold: samples.filter((s) => s.set === 'gold').length,
    safety: samples.filter((s) => s.set === 'safety').length,
    errors: samples.filter((s) => s.verifier.error !== null).length,
    wrongKeyCatch: rate(wrongCaught, wrongKeys),
    goodKeyFalseAlarm: rate(goodAlarms, goodKeys),
    unsafeCatch: rate(unsafe.filter((s) => s.verifier.flaggedUnsafe).length, unsafe.length),
    safeFalseAlarm: rate(safe.filter((s) => s.verifier.flaggedUnsafe).length, safe.length),
  };
}

function summarizeCost(
  generated: GeneratedSample[],
  labelled: LabelledSample[],
  accepted: number,
): RunSummary['cost'] {
  const all = [...generated, ...labelled];
  const priced = all.filter((s) => s.cost.usd !== null);
  const usd = priced.length === 0 ? null : priced.reduce((a, s) => a + (s.cost.usd as number), 0);
  const genPriced = generated.filter((s) => s.cost.usd !== null);
  const genUsd = genPriced.reduce((a, s) => a + (s.cost.usd as number), 0);
  const genComplete = generated.length > 0 && genPriced.length === generated.length;
  return {
    usd,
    unpriced: all.length - priced.length,
    inputTokens: all.reduce((a, s) => a + s.cost.inputTokens, 0),
    outputTokens: all.reduce((a, s) => a + s.cost.outputTokens, 0),
    perStoryUsd: genComplete ? genUsd / generated.length : null,
    perAcceptedStoryUsd: genComplete && accepted > 0 ? genUsd / accepted : null,
  };
}

/** Labelled samples that count: reviewed ones, or every one in a dry run that includes drafts. */
export const countedLabelled = (run: EvalRun): LabelledSample[] =>
  run.includesDrafts ? run.labelled : run.labelled.filter((s) => s.reviewed);

function labelledCheckFailures(samples: LabelledSample[]): LabelledCheckFailure[] {
  return samples
    .filter((s) => !s.checks.passed)
    .map((s) => ({ caseId: s.caseId, set: s.set, failures: [...s.checks.failures] }));
}

export function summarize(run: EvalRun): RunSummary {
  const generation = summarizeGeneration(run.generated);
  const counted = countedLabelled(run);
  return {
    labelledCheckFailures: labelledCheckFailures(counted),
    generation,
    drift: summarizeDrift(run.generated),
    verifier: summarizeVerifier(counted),
    cost: summarizeCost(run.generated, run.labelled, generation.accepted),
  };
}

/** `eval run` exits 1 when a counted gold or safety case fails the checks. */
export const runExitCode = (s: RunSummary): 0 | 1 => (s.labelledCheckFailures.length > 0 ? 1 : 0);
