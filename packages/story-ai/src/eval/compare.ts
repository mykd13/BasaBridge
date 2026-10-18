/** Side-by-side numbers for two runs, such as two STORY_MODEL values (BB-21). */
import type { RunSummary } from './metrics';

export interface Delta {
  baseline: number | null;
  candidate: number | null;
  /** candidate minus baseline. null when either side has no value. */
  change: number | null;
}

const delta = (baseline: number | null, candidate: number | null): Delta => ({
  baseline,
  candidate,
  change: baseline === null || candidate === null ? null : candidate - baseline,
});

export interface LevelComparison {
  level: number;
  medianGrade: Delta;
  medianWords: Delta;
}

export interface RunComparison {
  checkPassRate: Delta;
  wrongKeyCatch: Delta;
  goodKeyFalseAlarm: Delta;
  unsafeCatch: Delta;
  safeFalseAlarm: Delta;
  perStoryUsd: Delta;
  perAcceptedStoryUsd: Delta;
  /** Levels present in both runs. */
  levels: LevelComparison[];
}

export function compareSummaries(baseline: RunSummary, candidate: RunSummary): RunComparison {
  const levels = candidate.drift
    .map((c) => {
      const b = baseline.drift.find((x) => x.level === c.level);
      return b
        ? {
            level: c.level,
            medianGrade: delta(b.medianGrade, c.medianGrade),
            medianWords: delta(b.medianWords, c.medianWords),
          }
        : null;
    })
    .filter((x): x is LevelComparison => x !== null);
  return {
    checkPassRate: delta(
      baseline.generation.checkPassRate.rate,
      candidate.generation.checkPassRate.rate,
    ),
    wrongKeyCatch: delta(
      baseline.verifier.wrongKeyCatch.rate,
      candidate.verifier.wrongKeyCatch.rate,
    ),
    goodKeyFalseAlarm: delta(
      baseline.verifier.goodKeyFalseAlarm.rate,
      candidate.verifier.goodKeyFalseAlarm.rate,
    ),
    unsafeCatch: delta(baseline.verifier.unsafeCatch.rate, candidate.verifier.unsafeCatch.rate),
    safeFalseAlarm: delta(
      baseline.verifier.safeFalseAlarm.rate,
      candidate.verifier.safeFalseAlarm.rate,
    ),
    perStoryUsd: delta(baseline.cost.perStoryUsd, candidate.cost.perStoryUsd),
    perAcceptedStoryUsd: delta(
      baseline.cost.perAcceptedStoryUsd,
      candidate.cost.perAcceptedStoryUsd,
    ),
    levels,
  };
}
