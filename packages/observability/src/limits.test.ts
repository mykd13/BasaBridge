import { describe, expect, it } from 'vitest';
import { budgetDayStart, budgetFromEnv, chooseStorySource, DEFAULT_BUDGET } from './budget';
import {
  checkLimit,
  DEFAULT_POLICIES,
  hashSubject,
  policiesFromEnv,
  windowStart,
  type CounterStore,
} from './limits';

function memoryStore(): CounterStore & { keys: string[] } {
  const counts = new Map<string, number>();
  return {
    keys: [],
    async increment(key, start) {
      const k = `${key}@${start.toISOString()}`;
      const n = (counts.get(k) ?? 0) + 1;
      counts.set(k, n);
      this.keys.push(key);
      return n;
    },
  };
}

const secret = 'test-secret';
const now = new Date('2026-10-18T10:30:00Z');

describe('checkLimit', () => {
  it('allows up to the limit in one window, then refuses', async () => {
    const store = memoryStore();
    const policy = { limit: 3, windowSeconds: 3600 };
    const results = [];
    for (let i = 0; i < 4; i++)
      results.push(await checkLimit(store, 'story_per_learner', policy, 'L1', { secret, now }));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]!.retryAfterSeconds).toBe(1800);
  });

  it('starts again in the next window and counts subjects apart', async () => {
    const store = memoryStore();
    const policy = { limit: 1, windowSeconds: 60 };
    const opts = { secret, now };
    expect((await checkLimit(store, 'sign_in_per_ip', policy, 'a', opts)).allowed).toBe(true);
    expect((await checkLimit(store, 'sign_in_per_ip', policy, 'a', opts)).allowed).toBe(false);
    expect((await checkLimit(store, 'sign_in_per_ip', policy, 'b', opts)).allowed).toBe(true);
    const later = { secret, now: new Date(now.getTime() + 60_000) };
    expect((await checkLimit(store, 'sign_in_per_ip', policy, 'a', later)).allowed).toBe(true);
  });

  it('never stores the raw subject', async () => {
    const store = memoryStore();
    await checkLimit(
      store,
      'sign_in_per_account',
      DEFAULT_POLICIES.sign_in_per_account,
      'maria_s',
      {
        secret,
        now,
      },
    );
    await checkLimit(store, 'sign_in_per_ip', DEFAULT_POLICIES.sign_in_per_ip, '203.0.113.7', {
      secret,
      now,
    });
    const keys = store.keys.join(' ');
    expect(keys).not.toContain('maria');
    expect(keys).not.toContain('203.0.113.7');
    expect(store.keys[0]).toBe(`sign_in_per_account:${hashSubject('maria_s', secret)}`);
  });

  it('hashes depend on the secret', () => {
    expect(hashSubject('x', 'a')).not.toBe(hashSubject('x', 'b'));
  });

  it('aligns windows to the clock', () => {
    expect(windowStart(now, 3600).toISOString()).toBe('2026-10-18T10:00:00.000Z');
  });
});

describe('policiesFromEnv', () => {
  it('reads limit/seconds overrides and ignores bad values', () => {
    const p = policiesFromEnv({
      RATE_LIMIT_STORY_PER_LEARNER: '5/60',
      RATE_LIMIT_SPEECH_GLOBAL: 'lots',
      RATE_LIMIT_SIGN_IN_PER_IP: '0/60',
    });
    expect(p.story_per_learner).toEqual({ limit: 5, windowSeconds: 60 });
    expect(p.speech_global).toEqual(DEFAULT_POLICIES.speech_global);
    expect(p.sign_in_per_ip).toEqual(DEFAULT_POLICIES.sign_in_per_ip);
  });
});

describe('daily budget', () => {
  const config = { ...DEFAULT_BUDGET, globalDailyUsd: 10, learnerDailyUsd: 0.5, alertShare: 0.8 };

  it('generates while under both caps', () => {
    expect(chooseStorySource({ spentTodayUsd: 9.99, learnerSpentTodayUsd: 0.49, config })).toEqual({
      source: 'generate',
    });
  });

  it('serves the bank once the global cap is reached', () => {
    expect(chooseStorySource({ spentTodayUsd: 10, learnerSpentTodayUsd: 0, config })).toEqual({
      source: 'bank',
      reason: 'global_budget',
    });
  });

  it('serves the bank once the learner cap is reached', () => {
    expect(chooseStorySource({ spentTodayUsd: 1, learnerSpentTodayUsd: 0.5, config })).toEqual({
      source: 'bank',
      reason: 'learner_budget',
    });
  });

  it('reads the new tier cap and the unknown call price from the environment', () => {
    const c = budgetFromEnv({
      AI_NEW_LEARNER_DAILY_BUDGET_USD: '0.2',
      AI_UNKNOWN_CALL_USD: '0.05',
    });
    expect(c.learnerNewDailyUsd).toBe(0.2);
    expect(c.unknownCallUsd).toBe(0.05);
  });

  it('reads the caps from the environment with safe defaults', () => {
    expect(budgetFromEnv({})).toEqual(DEFAULT_BUDGET);
    expect(
      budgetFromEnv({
        AI_DAILY_BUDGET_USD: '25',
        AI_LEARNER_DAILY_BUDGET_USD: '-1',
        AI_BUDGET_ALERT_SHARE: '3',
      }),
    ).toEqual({ ...DEFAULT_BUDGET, globalDailyUsd: 25 });
  });

  it('starts the day at midnight in the Philippines', () => {
    // 15:59 UTC is 23:59 in Manila; 16:00 UTC is the next local day.
    expect(budgetDayStart(new Date('2026-10-18T15:59:00Z')).toISOString()).toBe(
      '2026-10-17T16:00:00.000Z',
    );
    expect(budgetDayStart(new Date('2026-10-18T16:00:00Z')).toISOString()).toBe(
      '2026-10-18T16:00:00.000Z',
    );
  });
});
