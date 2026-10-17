import { describe, expect, it } from 'vitest';
import { GoldCase, parseCases, reviewedCases, withWrongKeys } from './schema';

const TEXT = 'Ben has a red cap. He wears it to school. The wind takes it. A friend helps him.';

const q = (question: string, answerIndex: number, evidence: string) => ({
  skill: 'literal' as const,
  word: null,
  question,
  options: ['One', 'Two', 'Three', 'Four'],
  answerIndex,
  evidence,
});

const base = (): GoldCase => ({
  id: 'test-cap',
  story: {
    title: 'The red cap',
    text: TEXT,
    level: 8,
    questions: [
      q('What does Ben have?', 0, 'Ben has a red cap.'),
      q('Where does he wear it?', 1, 'He wears it to school.'),
      q('What takes the cap?', 2, 'The wind takes it.'),
      q('Who helps Ben?', 3, 'A friend helps him.'),
    ],
  },
  wrongKeys: [],
  unsafe: false,
  safetyCategory: null,
  source: 'drafted',
  reviewedBy: null,
  reviewedAt: null,
});

describe('GoldCase schema', () => {
  it('accepts a well formed case', () => {
    expect(GoldCase.safeParse(base()).success).toBe(true);
  });

  it('rejects an answer index outside the four options', () => {
    const c = base();
    c.story.questions[0] = { ...c.story.questions[0]!, answerIndex: 4 };
    expect(GoldCase.safeParse(c).success).toBe(false);
  });

  it('rejects evidence that is not in the passage', () => {
    const c = base();
    c.story.questions[0] = { ...c.story.questions[0]!, evidence: 'Ben has a blue cap.' };
    const result = GoldCase.safeParse(c);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(
      'evidence sentence is not in the passage',
    );
  });

  it('rejects a reviewer without a review date', () => {
    expect(GoldCase.safeParse({ ...base(), reviewedBy: 'teacher-a' }).success).toBe(false);
    expect(
      GoldCase.safeParse({ ...base(), reviewedBy: 'teacher-a', reviewedAt: '2026-10-17' }).success,
    ).toBe(true);
  });

  it('rejects an unsafe case without a category, and a safe case with one', () => {
    expect(GoldCase.safeParse({ ...base(), unsafe: true }).success).toBe(false);
    expect(GoldCase.safeParse({ ...base(), safetyCategory: 'violence' }).success).toBe(false);
  });

  it('rejects wrong keys past the last question or repeated', () => {
    expect(GoldCase.safeParse({ ...base(), wrongKeys: [5] }).success).toBe(false);
    expect(GoldCase.safeParse({ ...base(), wrongKeys: [2, 2] }).success).toBe(false);
  });
});

describe('set helpers', () => {
  it('rejects duplicate ids', () => {
    expect(() => parseCases([base(), base()])).toThrow('Duplicate case id: test-cap');
  });

  it('keeps only reviewed cases', () => {
    const reviewed = { ...base(), id: 'r', reviewedBy: 'teacher-a', reviewedAt: '2026-10-17' };
    expect(reviewedCases([base(), reviewed]).map((c) => c.id)).toEqual(['r']);
  });

  it('plants wrong keys on the named questions only', () => {
    const wrong = withWrongKeys(base(), [2]);
    expect(wrong.id).toBe('test-cap-wrong-2');
    expect(wrong.wrongKeys).toEqual([2]);
    expect(wrong.story.questions.map((x) => x.answerIndex)).toEqual([0, 2, 2, 3]);
    expect(GoldCase.safeParse(wrong).success).toBe(true);
  });
});
