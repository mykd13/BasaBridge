import { describe, expect, it } from 'vitest';
import {
  CAP_FALLBACK,
  DAILY_LIMIT,
  decideCap,
  decideCapOnError,
  learnerCapUsd,
  nextBudgetDay,
  type CapInput,
  type CapKind,
} from './caps';
import { learnerTier } from './tier';

const budget = { globalDailyUsd: 10, learnerDailyUsd: 0.5, learnerNewDailyUsd: 0.1 };
const KINDS: CapKind[] = ['story', 'speech', 'tts'];
// 10:00 in Manila on 18 October 2026.
const now = new Date('2026-10-18T02:00:00Z');
const midnightManila = new Date('2026-10-18T16:00:00Z');

const input = (over: Partial<CapInput> = {}): CapInput => ({
  kind: 'story',
  tier: 'standard',
  spentTodayUsd: 0,
  learnerSpentTodayUsd: 0,
  budget,
  limit: { allowed: true },
  now,
  ...over,
});

describe('learnerTier', () => {
  it('is new only with no email and no finished story', () => {
    expect(learnerTier({ emailReal: false, hasFinishedStory: false })).toBe('new');
    expect(learnerTier({ emailReal: true, hasFinishedStory: false })).toBe('standard');
    expect(learnerTier({ emailReal: false, hasFinishedStory: true })).toBe('standard');
    expect(learnerTier({ emailReal: true, hasFinishedStory: true })).toBe('standard');
  });
});

describe('learnerCapUsd', () => {
  it('gives the new tier the lower cap', () => {
    expect(learnerCapUsd('new', budget)).toBe(0.1);
    expect(learnerCapUsd('standard', budget)).toBe(0.5);
  });

  it('never lets a misconfigured new cap go above the standard cap', () => {
    expect(learnerCapUsd('new', { ...budget, learnerNewDailyUsd: 5 })).toBe(0.5);
  });
});

describe('nextBudgetDay', () => {
  it('is the next midnight in Manila', () => {
    expect(nextBudgetDay(now)).toEqual(midnightManila);
  });

  it('moves to the following day exactly at midnight', () => {
    expect(nextBudgetDay(midnightManila)).toEqual(new Date('2026-10-19T16:00:00Z'));
    expect(nextBudgetDay(new Date(midnightManila.getTime() - 1))).toEqual(midnightManila);
  });
});

describe('decideCap', () => {
  it('allows under every cap', () => {
    for (const kind of KINDS) expect(decideCap(input({ kind }))).toEqual({ action: 'allow' });
  });

  it('falls back by kind past the learner cap, with the notice and reset time', () => {
    for (const kind of KINDS) {
      expect(decideCap(input({ kind, learnerSpentTodayUsd: 0.5 }))).toEqual({
        action: CAP_FALLBACK[kind],
        reason: 'learner_budget',
        notice: DAILY_LIMIT,
        resetsAt: midnightManila,
      });
    }
    expect(CAP_FALLBACK).toEqual({
      story: 'bank_story',
      speech: 'silent_reading',
      tts: 'browser_voice',
    });
  });

  it('uses the lower cap for a new account', () => {
    const spent = { learnerSpentTodayUsd: 0.2 };
    expect(decideCap(input({ ...spent, tier: 'standard' })).action).toBe('allow');
    expect(decideCap(input({ ...spent, tier: 'new' }))).toMatchObject({
      action: 'bank_story',
      reason: 'learner_budget',
    });
  });

  it('refuses past the global budget first', () => {
    expect(
      decideCap(input({ kind: 'speech', spentTodayUsd: 10, learnerSpentTodayUsd: 1 })),
    ).toMatchObject({ action: 'silent_reading', reason: 'global_budget' });
  });

  it('refuses when the rate limit is used up', () => {
    expect(decideCap(input({ kind: 'tts', limit: { allowed: false } }))).toMatchObject({
      action: 'browser_voice',
      reason: 'rate_limit',
    });
  });
});

describe('decideCapOnError', () => {
  it('fails closed with the fallback for each kind', () => {
    for (const kind of KINDS) {
      expect(decideCapOnError(kind, now)).toEqual({
        action: CAP_FALLBACK[kind],
        reason: 'check_failed',
        notice: DAILY_LIMIT,
        resetsAt: midnightManila,
      });
    }
  });
});
