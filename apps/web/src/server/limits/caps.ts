/**
 * Daily cost caps per learner (BB-63). Pure decisions only: the app reads today's spend and the
 * rate limit results (BB-39) and passes them in.
 *
 * Past a cap, learning goes on without new cost until midnight in the Philippines:
 * - story: a story from the bank instead of a new one;
 * - speech: silent reading, so the learner reads and answers without the microphone;
 * - tts: the browser's own voice, which the speak button already falls back to (BB-57).
 * Every refusal carries the DAILY_LIMIT notice code, which the screens show as a friendly
 * "come back tomorrow" message from the i18n catalog (BB-58).
 */
import type { LearnerTier } from './tier';

export type CapKind = 'story' | 'speech' | 'tts';

export const CAP_FALLBACK = {
  story: 'bank_story',
  speech: 'silent_reading',
  tts: 'browser_voice',
} as const satisfies Record<CapKind, string>;

export type CapFallback = (typeof CAP_FALLBACK)[CapKind];

/** Matches BB-39's StorySource reasons, plus check_failed for a read that did not work. */
export type CapReason = 'global_budget' | 'learner_budget' | 'rate_limit' | 'check_failed';

export const DAILY_LIMIT = 'DAILY_LIMIT' as const;

export type CapDecision =
  | { action: 'allow' }
  | {
      action: CapFallback;
      reason: CapReason;
      notice: typeof DAILY_LIMIT;
      /** When the cap lifts: the next midnight in the Philippines. */
      resetsAt: Date;
    };

/** Daily caps in US dollars, read from configuration (BB-39 budgetFromEnv). */
export interface CapBudget {
  globalDailyUsd: number;
  learnerDailyUsd: number;
  /** The lower cap for the new tier (AI_NEW_LEARNER_DAILY_BUDGET_USD). */
  learnerNewDailyUsd: number;
}

export interface CapInput {
  kind: CapKind;
  tier: LearnerTier;
  /** Spend since the start of today's budget day, for everyone and for this learner. */
  spentTodayUsd: number;
  learnerSpentTodayUsd: number;
  budget: CapBudget;
  /** Per-learner rate limit result for this kind, already counted (BB-39 checkLimit). */
  limit: { allowed: boolean };
  now: Date;
}

/**
 * The Philippines has no daylight saving time, so a fixed offset is exact. The same rule as
 * BB-39's budgetDayStart. Switch to that import once BB-39 is on main.
 */
const PH_UTC_OFFSET_HOURS = 8;
const DAY_MS = 24 * 3600 * 1000;

export function nextBudgetDay(now: Date, utcOffsetHours = PH_UTC_OFFSET_HOURS): Date {
  const offset = utcOffsetHours * 3600 * 1000;
  return new Date(Math.floor((now.getTime() + offset) / DAY_MS) * DAY_MS - offset + DAY_MS);
}

export function learnerCapUsd(tier: LearnerTier, budget: CapBudget): number {
  return tier === 'new'
    ? Math.min(budget.learnerNewDailyUsd, budget.learnerDailyUsd)
    : budget.learnerDailyUsd;
}

function refuse(kind: CapKind, reason: CapReason, now: Date): CapDecision {
  return { action: CAP_FALLBACK[kind], reason, notice: DAILY_LIMIT, resetsAt: nextBudgetDay(now) };
}

export function decideCap(input: CapInput): CapDecision {
  const { kind, now } = input;
  if (input.spentTodayUsd >= input.budget.globalDailyUsd) return refuse(kind, 'global_budget', now);
  if (input.learnerSpentTodayUsd >= learnerCapUsd(input.tier, input.budget)) {
    return refuse(kind, 'learner_budget', now);
  }
  if (!input.limit.allowed) return refuse(kind, 'rate_limit', now);
  return { action: 'allow' };
}

/** When spend or limits cannot be read, refuse: an outage must never run up cost. */
export function decideCapOnError(kind: CapKind, now: Date): CapDecision {
  return refuse(kind, 'check_failed', now);
}
