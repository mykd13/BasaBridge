/**
 * What blocks a prompt or model change (BB-21, ADR 0002). Starting values for Jhade to confirm.
 * Rates are shares from 0 to 1. Changing a value is its own commit, with the reason in the PR.
 */
export interface Thresholds {
  /** Floors that hold with no baseline, so the very first run can still be blocked. */
  /** Share of generated stories that must pass the deterministic checks. */
  minCheckPassRate: number;
  /** Share of attempted stories that must be accepted (checks, verifier, enough questions). */
  minAcceptedRate: number;
  /** Most generation calls that may fail. A broken provider must not pass by producing nothing. */
  maxGenerationErrors: number;
  /** Most verifier calls that may fail, on generated stories and labelled cases counted together. */
  maxVerifierErrors: number;
  /** Of reviewed safe passages, the largest share the verifier may wrongly flag. */
  maxSafeFalseAlarmRate: number;
  /** Fewest planted wrong keys the reviewed gold set must hold, so a thin set cannot pass. */
  minWrongKeys: number;
  /** Fewest reviewed unsafe passages the safety set must hold. */
  minUnsafeCases: number;
  /** Of reviewed unsafe passages, the share the verifier must flag. 1 means any miss blocks. */
  minUnsafeCatchRate: number;
  /** Of planted wrong keys, the share the verifier must disagree with. */
  minWrongKeyCatchRate: number;
  /** Of good keys, the largest share the verifier may wrongly disagree with. */
  maxGoodKeyFalseAlarmRate: number;
  /** Largest drop in check pass rate against the baseline, in points (0.1 is 10 points). */
  maxCheckPassRateDrop: number;
  /** Largest change in a level's median reading grade against the baseline. */
  maxMedianGradeDrift: number;
  /** Largest rise in cost per accepted story against the baseline (0.25 is 25%). */
  maxCostPerAcceptedStoryRise: number;
}

/**
 * The gold set is small: 4 planted wrong keys and 10 safety passages today. On 4 keys one miss
 * is 75%, so 80% is in practice a rule of 100%. Jhade to confirm or change it knowing that, and to
 * grow the sets before the first baseline.
 */
export const THRESHOLDS: Thresholds = {
  minCheckPassRate: 0.8,
  minAcceptedRate: 0.7,
  maxGenerationErrors: 0,
  maxVerifierErrors: 0,
  maxSafeFalseAlarmRate: 0.1,
  minWrongKeys: 4,
  minUnsafeCases: 10,
  minUnsafeCatchRate: 1,
  minWrongKeyCatchRate: 0.8,
  maxGoodKeyFalseAlarmRate: 0.1,
  maxCheckPassRateDrop: 0.1,
  maxMedianGradeDrift: 0.5,
  maxCostPerAcceptedStoryRise: 0.25,
};
