/**
 * Decides whether a candidate run may replace the current prompt or model (BB-21).
 * Messages are plain English with numbers only, so they are safe to paste into a PR.
 */
import { compareSummaries } from './compare';
import { summarize, type Rate } from './metrics';
import type { EvalRun } from './run';
import { THRESHOLDS, type Thresholds } from './thresholds';

export interface GateResult {
  pass: boolean;
  /** Each reason the change is blocked. */
  failures: string[];
  /** Things the gate could not check. They do not block. */
  notes: string[];
}

const points = (x: number) => `${Math.round(x * 1000) / 10}`;
const pct = (x: number) => `${points(x)}%`;
const of = (r: Rate) => `${r.part} of ${r.whole}`;

export function gate(
  candidate: EvalRun,
  baseline: EvalRun | null,
  t: Thresholds = THRESHOLDS,
): GateResult {
  const failures: string[] = [];
  const notes: string[] = [];
  const c = summarize(candidate);

  if (candidate.includesDrafts) {
    failures.push('The run counted unreviewed draft cases. Run it again without --include-drafts.');
  }
  if (c.verifier.gold === 0) {
    failures.push('No reviewed gold cases. A person must review the gold set first.');
  }
  if (c.verifier.safety === 0) {
    failures.push('No reviewed safety cases. A person must review the safety set first.');
  }

  const { unsafeCatch, wrongKeyCatch, goodKeyFalseAlarm } = c.verifier;
  if (unsafeCatch.rate !== null && unsafeCatch.rate < t.minUnsafeCatchRate) {
    failures.push(
      `Unsafe catch rate ${pct(unsafeCatch.rate)} (${of(unsafeCatch)}) is under ${pct(t.minUnsafeCatchRate)}.`,
    );
  }
  if (wrongKeyCatch.rate === null) {
    if (c.verifier.gold > 0) failures.push('No reviewed cases with planted wrong keys.');
  } else if (wrongKeyCatch.rate < t.minWrongKeyCatchRate) {
    failures.push(
      `Wrong-key catch rate ${pct(wrongKeyCatch.rate)} (${of(wrongKeyCatch)}) is under ${pct(t.minWrongKeyCatchRate)}.`,
    );
  }
  if (goodKeyFalseAlarm.rate !== null && goodKeyFalseAlarm.rate > t.maxGoodKeyFalseAlarmRate) {
    failures.push(
      `Good-key false alarm rate ${pct(goodKeyFalseAlarm.rate)} (${of(goodKeyFalseAlarm)}) is over ${pct(t.maxGoodKeyFalseAlarmRate)}.`,
    );
  }

  if (c.generation.attempted === 0) {
    notes.push('No stories were generated, so difficulty and cost were not checked.');
  }
  for (const d of c.drift) {
    if (d.medianGrade !== null && d.medianGrade > d.maxReadingGrade) {
      failures.push(
        `Level ${d.level}: median reading grade ${d.medianGrade.toFixed(1)} is over the cap ${d.maxReadingGrade}.`,
      );
    }
    if (
      d.medianWords !== null &&
      (d.medianWords < d.wordRange.min || d.medianWords > d.wordRange.max)
    ) {
      failures.push(
        `Level ${d.level}: median length ${d.medianWords} words is outside ${d.wordRange.min}-${d.wordRange.max}.`,
      );
    }
  }

  if (baseline === null) {
    notes.push('No baseline, so changes against a baseline were not checked.');
  } else {
    if (baseline.includesDrafts) notes.push('The baseline counted draft cases.');
    const cmp = compareSummaries(summarize(baseline), c);
    const drop = cmp.checkPassRate.change === null ? null : -cmp.checkPassRate.change;
    if (drop !== null && drop > t.maxCheckPassRateDrop) {
      failures.push(
        `Check pass rate fell ${points(drop)} points (${pct(cmp.checkPassRate.baseline!)} to ${pct(cmp.checkPassRate.candidate!)}), more than ${points(t.maxCheckPassRateDrop)}.`,
      );
    }
    for (const l of cmp.levels) {
      const change = l.medianGrade.change;
      if (change !== null && Math.abs(change) > t.maxMedianGradeDrift) {
        failures.push(
          `Level ${l.level}: median reading grade moved ${change.toFixed(1)} against the baseline, more than ${t.maxMedianGradeDrift}.`,
        );
      }
    }
    const { baseline: was, candidate: now } = cmp.perAcceptedStoryUsd;
    if (was !== null && now !== null && was > 0) {
      const rise = now / was - 1;
      if (rise > t.maxCostPerAcceptedStoryRise) {
        failures.push(
          `Cost per accepted story rose ${pct(rise)} ($${was.toFixed(4)} to $${now.toFixed(4)}), more than ${pct(t.maxCostPerAcceptedStoryRise)}.`,
        );
      }
    } else if (was === 0) {
      notes.push('The baseline cost nothing per accepted story, so cost was not compared.');
    } else if (c.generation.attempted > 0) {
      notes.push('Cost per accepted story is missing on one side, so cost was not compared.');
    }
  }

  return { pass: failures.length === 0, failures, notes };
}
