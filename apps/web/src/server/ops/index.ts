/**
 * Server-side observability for the web app (BB-39). Server only: never import this from a
 * client component.
 *
 * Feature code uses these helpers:
 * - `log` for structured logs (fields are redacted).
 * - `meter(context, fn, options)` around every AI and speech call.
 * - `enforceLimit(name, subject)` before story generation, speech analysis and sign-in.
 * - `storySourceFor(learnerUserId)` before generating a story; `bank` means serve the story bank.
 */
import {
  ERROR_BUCKET_SECONDS,
  ERROR_COUNTER_KEYS,
  budgetDayStart,
  budgetFromEnv,
  checkLimit,
  chooseStorySource,
  createLogger,
  meterCall,
  policiesFromEnv,
  windowStart,
  type CallContext,
  type CallSink,
  type CounterStore,
  type LimitResult,
  type MeterOptions,
  type PolicyName,
  type StorySource,
} from '@basabridge/observability';
import { incrementCounter, insertAiCall, sumCostSince } from '@basabridge/db';
import { getDb } from './db';

export const log = createLogger({
  service: 'web',
  base: { env: process.env.VERCEL_ENV ?? 'development' },
});

export const counterStore: CounterStore = {
  increment: (key, start, expiresAt) => incrementCounter(getDb(), key, start, expiresAt),
};

export const callSink: CallSink = {
  record: async (call) => {
    await insertAiCall(getDb(), call);
  },
};

/** Meters one AI or speech call into ai_calls and the log. */
export function meter<T>(
  context: CallContext,
  fn: () => Promise<T>,
  options: Omit<MeterOptions<T>, 'sink' | 'logger'> = {},
): Promise<T> {
  return meterCall(context, fn, { ...options, sink: callSink, logger: log });
}

function limitSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return secret;
}

/** Counts one use and says whether it is allowed. Every refusal is logged (BB-63 reads these). */
export async function enforceLimit(name: PolicyName, subject: string): Promise<LimitResult> {
  const policy = policiesFromEnv(process.env)[name];
  const result = await checkLimit(counterStore, name, policy, subject, { secret: limitSecret() });
  if (!result.allowed) log.warn('limit.hit', { policy: name, limit: result.limit });
  return result;
}

/**
 * Whether to generate a new story or serve one from the bank, from today's spend and the rate
 * limits. A database failure serves the bank, so an outage never runs up cost.
 */
export async function storySourceFor(learnerUserId: string): Promise<StorySource> {
  try {
    const db = getDb();
    const since = budgetDayStart(new Date());
    const [spent, learnerSpent] = await Promise.all([
      sumCostSince(db, since),
      sumCostSince(db, since, learnerUserId),
    ]);
    const choice = chooseStorySource({
      spentTodayUsd: spent,
      learnerSpentTodayUsd: learnerSpent,
      config: budgetFromEnv(process.env),
    });
    if (choice.source === 'bank') {
      log.warn('budget.hit', { reason: choice.reason, learnerUserId });
      return choice;
    }
    for (const [name, subject] of [
      ['story_global', 'global'],
      ['story_per_learner', learnerUserId],
    ] as const) {
      if (!(await enforceLimit(name, subject)).allowed)
        return { source: 'bank', reason: 'rate_limit' };
    }
    return choice;
  } catch (err) {
    log.error('budget.check_failed', { error: err });
    return { source: 'bank', reason: 'global_budget' };
  }
}

/** Adds one to the server or browser error count for this 5-minute bucket. */
export async function countError(kind: keyof typeof ERROR_COUNTER_KEYS): Promise<void> {
  const now = new Date();
  const start = windowStart(now, ERROR_BUCKET_SECONDS);
  const expires = new Date(start.getTime() + 2 * 24 * 3600 * 1000);
  await counterStore.increment(ERROR_COUNTER_KEYS[kind], start, expires);
}
