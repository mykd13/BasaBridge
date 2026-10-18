/**
 * Daily AI budget (BB-39). A hard cap on spend per day, for the whole app and for each learner.
 * Past either cap, story generation stops and the learner gets a story from the bank instead.
 * Days start at midnight in the Philippines.
 */
import { positiveNumber, type Env } from './env';

/** The Philippines has no daylight saving time, so a fixed offset is exact. */
export const BUDGET_UTC_OFFSET_HOURS = 8;

export interface BudgetConfig {
  /** US dollars per day across everyone. */
  globalDailyUsd: number;
  /** US dollars per day for one learner. BB-63 builds its friendly message on this cap. */
  learnerDailyUsd: number;
  /** The lower per learner cap for the new tier (BB-63 caps). */
  learnerNewDailyUsd: number;
  /** Counted for a call with no recorded cost, so failed or unpriced calls cannot hide spend. */
  unknownCallUsd: number;
  /** Share of the global budget that raises a high cost alert, 0..1. */
  alertShare: number;
}

export const DEFAULT_BUDGET: BudgetConfig = {
  globalDailyUsd: 10,
  learnerDailyUsd: 0.5,
  learnerNewDailyUsd: 0.1,
  unknownCallUsd: 0.01,
  alertShare: 0.8,
};

/** AI_DAILY_BUDGET_USD, AI_LEARNER_DAILY_BUDGET_USD and AI_BUDGET_ALERT_SHARE. */
export function budgetFromEnv(env: Env): BudgetConfig {
  const share = positiveNumber(env, 'AI_BUDGET_ALERT_SHARE', DEFAULT_BUDGET.alertShare);
  return {
    globalDailyUsd: positiveNumber(env, 'AI_DAILY_BUDGET_USD', DEFAULT_BUDGET.globalDailyUsd),
    learnerDailyUsd: positiveNumber(
      env,
      'AI_LEARNER_DAILY_BUDGET_USD',
      DEFAULT_BUDGET.learnerDailyUsd,
    ),
    learnerNewDailyUsd: positiveNumber(
      env,
      'AI_NEW_LEARNER_DAILY_BUDGET_USD',
      DEFAULT_BUDGET.learnerNewDailyUsd,
    ),
    unknownCallUsd: positiveNumber(env, 'AI_UNKNOWN_CALL_USD', DEFAULT_BUDGET.unknownCallUsd),
    alertShare: share <= 1 ? share : DEFAULT_BUDGET.alertShare,
  };
}

/** The start of the budget day that contains `now`, as a UTC instant. */
export function budgetDayStart(now: Date, utcOffsetHours = BUDGET_UTC_OFFSET_HOURS): Date {
  const day = 24 * 3600 * 1000;
  const offset = utcOffsetHours * 3600 * 1000;
  return new Date(Math.floor((now.getTime() + offset) / day) * day - offset);
}

export type StorySource =
  | { source: 'generate' }
  | { source: 'bank'; reason: 'global_budget' | 'learner_budget' | 'rate_limit' };

export interface StorySourceInput {
  spentTodayUsd: number;
  learnerSpentTodayUsd: number;
  config: BudgetConfig;
}

/** Generate a new story, or serve one from the bank because a daily cap is reached. */
export function chooseStorySource(input: StorySourceInput): StorySource {
  if (input.spentTodayUsd >= input.config.globalDailyUsd)
    return { source: 'bank', reason: 'global_budget' };
  if (input.learnerSpentTodayUsd >= input.config.learnerDailyUsd)
    return { source: 'bank', reason: 'learner_budget' };
  return { source: 'generate' };
}
