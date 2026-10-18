import { describe, expect, it } from 'vitest';
import { summariseVerifications, VERIFICATION_OUTCOMES, type VerificationRecord } from './metrics';

const rec = (over: Partial<VerificationRecord>): VerificationRecord => ({
  level: 3,
  questionsIn: 5,
  agreed: 5,
  disagreed: 0,
  outcome: 'kept',
  categories: [],
  ...over,
});

describe('summariseVerifications', () => {
  it('computes rates on a fixed list', () => {
    const s = summariseVerifications([
      rec({}),
      rec({ agreed: 4, disagreed: 1 }),
      rec({ agreed: 3, disagreed: 2, outcome: 'rejected_too_few' }),
      rec({ outcome: 'rejected_unsafe', categories: ['fear', 'brands'] }),
      rec({ questionsIn: 0, agreed: 0, outcome: 'model_call_failed' }),
    ]);
    expect(s.stories).toBe(5);
    expect(s.questions).toBe(20);
    expect(s.disagreementRate).toBeCloseTo(3 / 20);
    expect(s.rejectionRate).toBeCloseTo(3 / 5);
    expect(s.outcomeCounts).toEqual({
      kept: 2,
      rejected_unsafe: 1,
      rejected_too_few: 1,
      invalid_reply: 0,
      model_call_failed: 1,
    });
    expect(s.categoryCounts.fear).toBe(1);
    expect(s.categoryCounts.brands).toBe(1);
    expect(s.categoryCounts.violence).toBe(0);
  });

  it('returns zeros for an empty list, never NaN', () => {
    const s = summariseVerifications([]);
    expect(s.disagreementRate).toBe(0);
    expect(s.rejectionRate).toBe(0);
    expect(s.stories).toBe(0);
    for (const o of VERIFICATION_OUTCOMES) expect(s.outcomeCounts[o]).toBe(0);
  });

  it('holds only numbers, enums and category lists', () => {
    const r = rec({});
    const allowed = ['level', 'questionsIn', 'agreed', 'disagreed', 'outcome', 'categories'];
    expect(Object.keys(r).sort()).toEqual([...allowed].sort());
    for (const [key, value] of Object.entries(r)) {
      if (key === 'outcome') expect(VERIFICATION_OUTCOMES).toContain(value);
      else if (key === 'categories') expect(Array.isArray(value)).toBe(true);
      else expect(typeof value).toBe('number');
    }
  });
});
