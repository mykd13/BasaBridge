import { describe, expect, it } from 'vitest';
import type { StoryQuestion } from '@basabridge/contracts';
import type { VerifierReply } from './reply';
import { judgeVerification } from './verdict';

const q = (n: number, answerIndex: number): StoryQuestion => ({
  skill: 'literal',
  word: null,
  question: `Question text ${n}?`,
  options: ['a', 'b', 'c', 'd'],
  answerIndex,
  evidence: `Evidence ${n}.`,
});

// Keys: 0, 1, 2, 3, 0
const questions = [q(1, 0), q(2, 1), q(3, 2), q(4, 3), q(5, 0)];

const reply = (
  indexes: (number | null)[],
  safety: VerifierReply['safety'] = { safe: true, categories: [], reason: 'ok' },
): VerifierReply => ({
  answers: indexes.flatMap((a, i) => (a === null ? [] : [{ question: i + 1, answerIndex: a }])),
  safety,
});

describe('judgeVerification', () => {
  it('keeps everything when all agree', () => {
    const v = judgeVerification(questions, reply([0, 1, 2, 3, 0]));
    expect(v).toEqual({ ok: true, kept: questions, disagreed: [] });
  });

  it('keeps four when one disagrees', () => {
    const v = judgeVerification(questions, reply([0, 3, 2, 3, 0]));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.kept).toHaveLength(4);
      expect(v.disagreed).toEqual([2]);
    }
  });

  it('rejects when two disagree, with a short plain reason', () => {
    const v = judgeVerification(questions, reply([0, 3, 2, 0, 0]));
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.outcome).toBe('rejected_too_few');
      expect(v.disagreed).toEqual([2, 4]);
      expect(v.reason).toBe(
        'The checker disagreed with the answer key on questions 2 and 4, leaving 3.',
      );
    }
  });

  it('rejects an unsafe passage even when every answer is correct', () => {
    const v = judgeVerification(
      questions,
      reply([0, 1, 2, 3, 0], { safe: false, categories: ['fear'], reason: 'scary' }),
    );
    expect(v).toMatchObject({
      ok: false,
      outcome: 'rejected_unsafe',
      categories: ['fear'],
      reason: 'The passage was flagged as not safe for children: fear.',
    });
  });

  it('counts a missing answer as a disagreement', () => {
    const v = judgeVerification(questions, reply([0, 1, 2, 3, null]));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.disagreed).toEqual([5]);
  });

  it('rejects when too many answers are missing', () => {
    const v = judgeVerification(questions, reply([0, 1, null, null, null]));
    expect(v).toMatchObject({ ok: false, outcome: 'rejected_too_few', disagreed: [3, 4, 5] });
  });

  it('preserves the order of kept questions', () => {
    const v = judgeVerification(questions, reply([0, 1, 0, 3, 0]));
    expect(v.ok && v.kept.map((k) => k.question)).toEqual([
      'Question text 1?',
      'Question text 2?',
      'Question text 4?',
      'Question text 5?',
    ]);
  });

  it('rejects a story that started with too few questions', () => {
    const v = judgeVerification(questions.slice(0, 3), reply([0, 1, 2]));
    expect(v).toMatchObject({ ok: false, outcome: 'rejected_too_few', disagreed: [] });
  });
});
