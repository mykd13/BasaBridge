import { describe, expect, it } from 'vitest';
import { SAMPLE_GOLD_CASES } from './fixtures/gold.sample';
import { measureVerifier, type GoldCase } from './measure';
import type { VerifyOutcome } from './verify';

const record = (outcome: 'kept' | 'rejected_unsafe' | 'rejected_too_few', disagreed: number) => ({
  level: 3,
  questionsIn: 5,
  agreed: 5 - disagreed,
  disagreed,
  outcome,
  categories: [],
});

const kept = (disagreed: number[]): VerifyOutcome => ({
  ok: true,
  questions: [],
  disagreed,
  record: record('kept', disagreed.length),
});

const unsafe = (): VerifyOutcome => ({
  ok: false,
  kind: 'rejected',
  reason: 'x',
  disagreed: [],
  categories: ['fear'],
  record: { ...record('rejected_unsafe', 0), categories: ['fear'] },
});

const byId = (cases: GoldCase[], id: string) => cases.find((c) => c.id === id)!;

/** A scripted fake verifier keyed by case, so the tests check arithmetic and not a model. */
function scripted(script: Record<string, VerifyOutcome>) {
  return async (story: GoldCase['story']) => {
    const hit = SAMPLE_GOLD_CASES.find((c) => c.story === story);
    return script[hit!.id]!;
  };
}

describe('measureVerifier', () => {
  it('scores a perfect checker', async () => {
    const m = await measureVerifier(
      SAMPLE_GOLD_CASES,
      scripted({
        'sample-clean': kept([]),
        'sample-wrong-key': kept([2]),
        'sample-unsafe': unsafe(),
      }),
    );
    expect(m).toEqual({
      wrongKeyCatchRate: 1,
      goodKeyFalseAlarmRate: 0,
      unsafeCatchRate: 1,
      safeFalseAlarmRate: 0,
      cases: 3,
    });
  });

  it('counts misses and false alarms', async () => {
    const m = await measureVerifier(
      SAMPLE_GOLD_CASES,
      scripted({
        // One good key wrongly disputed on the clean story, wrong key missed, unsafe missed.
        'sample-clean': kept([3]),
        'sample-wrong-key': kept([]),
        'sample-unsafe': kept([]),
      }),
    );
    expect(m.wrongKeyCatchRate).toBe(0);
    // Good keys: 5 (clean) + 4 (wrong-key case) + 5 (unsafe) = 14; one false alarm.
    expect(m.goodKeyFalseAlarmRate).toBeCloseTo(1 / 14);
    expect(m.unsafeCatchRate).toBe(0);
    expect(m.safeFalseAlarmRate).toBe(0);
  });

  it('counts a safe story flagged as unsafe as a false alarm', async () => {
    const m = await measureVerifier([byId(SAMPLE_GOLD_CASES, 'sample-clean')], async () =>
      unsafe(),
    );
    expect(m.safeFalseAlarmRate).toBe(1);
    expect(m.unsafeCatchRate).toBe(0);
  });

  it('returns zeros for an empty set, never NaN', async () => {
    const m = await measureVerifier([], async () => kept([]));
    expect(m).toEqual({
      wrongKeyCatchRate: 0,
      goodKeyFalseAlarmRate: 0,
      unsafeCatchRate: 0,
      safeFalseAlarmRate: 0,
      cases: 0,
    });
  });

  it('marks the fixtures as samples with sensible labels', () => {
    expect(SAMPLE_GOLD_CASES.every((c) => c.id.startsWith('sample-'))).toBe(true);
    expect(byId(SAMPLE_GOLD_CASES, 'sample-wrong-key').wrongKeys).toEqual([2]);
    expect(byId(SAMPLE_GOLD_CASES, 'sample-unsafe').unsafe).toBe(true);
  });
});
