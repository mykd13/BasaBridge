import { describe, expect, it } from 'vitest';
import type { TryAnalysis, WordResult } from '@basabridge/contracts';
import { TryAnalysis as TryAnalysisSchema } from '@basabridge/contracts';
import { summariseTry } from './index';
import {
  MISHEARD_LIMITS,
  correctedShare,
  correctionAudit,
  correctionDecision,
  markMisheard,
  maxMarksForTry,
} from './misheard';

const word = (expected: string | null, outcome: WordResult['outcome']): WordResult => ({
  expected,
  heard: outcome === 'omission' ? null : expected,
  outcome,
  confidence: 0.9,
  markedMisheard: false,
});

/** Ten expected words: eight right, one substitution (index 3), one omission at the end (index 9). */
function tryOf(): TryAnalysis {
  const words = Array.from({ length: 10 }, (_, i) => word(`w${i}`, 'correct'));
  words[3] = word('w3', 'substitution');
  words[9] = word('w9', 'omission');
  return summariseTry(words, 12);
}

describe('markMisheard', () => {
  it('sets the mark and recomputes words right, completion and pace', () => {
    const before = tryOf();
    expect(before.wordsRight).toBe(8);
    expect(before.completed).toBe(false);
    const r = markMisheard({ analysis: before, wordIndexes: [3, 9], markedToday: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.record.wordsRight).toBe(10);
    expect(r.record.completed).toBe(true);
    expect(r.record.wordsPerMinute).toBe(50);
    expect(r.record.analysis.words[3]?.markedMisheard).toBe(true);
    expect(r.record.analysis.words[3]?.outcome).toBe('substitution');
    expect(TryAnalysisSchema.safeParse(r.record.analysis).success).toBe(true);
  });

  it('does not change the try it was given', () => {
    const before = tryOf();
    markMisheard({ analysis: before, wordIndexes: [3], markedToday: 0 });
    expect(before.words[3]?.markedMisheard).toBe(false);
    expect(before.wordsRight).toBe(8);
  });

  it('refuses words that were already right', () => {
    const r = markMisheard({ analysis: tryOf(), wordIndexes: [0], markedToday: 0 });
    expect(r).toEqual({ ok: false, reason: 'not_markable' });
  });

  it('refuses insertions, bad indexes and an empty list', () => {
    const words = [word('a', 'substitution'), word(null, 'insertion')];
    const a = summariseTry(words, 2);
    expect(markMisheard({ analysis: a, wordIndexes: [1], markedToday: 0 })).toEqual({
      ok: false,
      reason: 'not_markable',
    });
    expect(markMisheard({ analysis: a, wordIndexes: [5], markedToday: 0 })).toEqual({
      ok: false,
      reason: 'not_markable',
    });
    expect(markMisheard({ analysis: a, wordIndexes: [-1], markedToday: 0 })).toEqual({
      ok: false,
      reason: 'not_markable',
    });
    expect(markMisheard({ analysis: a, wordIndexes: [], markedToday: 0 })).toEqual({
      ok: false,
      reason: 'nothing_to_mark',
    });
  });

  it('marking an already marked word changes nothing and costs nothing', () => {
    const first = markMisheard({ analysis: tryOf(), wordIndexes: [3], markedToday: 0 });
    if (!first.ok) throw new Error('expected ok');
    const again = markMisheard({
      analysis: first.record.analysis,
      wordIndexes: [3, 3],
      markedToday: MISHEARD_LIMITS.maxPerDay,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.newlyMarked).toEqual([]);
    expect(again.record.wordsRight).toBe(first.record.wordsRight);
  });

  it('stops a try from having too many words marked, and marks nothing', () => {
    const words = Array.from({ length: 10 }, (_, i) => word(`w${i}`, 'substitution'));
    const a = summariseTry(words, 10);
    expect(maxMarksForTry(10)).toBe(2);
    expect(markMisheard({ analysis: a, wordIndexes: [0, 1, 2], markedToday: 0 })).toEqual({
      ok: false,
      reason: 'try_limit_reached',
    });
    const ok = markMisheard({ analysis: a, wordIndexes: [0, 1], markedToday: 0 });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.correctedShare).toBeCloseTo(0.2);
    // Already at the limit: one more word is refused.
    expect(
      markMisheard({ analysis: ok.record.analysis, wordIndexes: [2], markedToday: 2 }),
    ).toEqual({
      ok: false,
      reason: 'try_limit_reached',
    });
  });

  it('lets a very short try have one word fixed', () => {
    expect(maxMarksForTry(3)).toBe(1);
    expect(maxMarksForTry(0)).toBe(1);
  });

  it('stops a learner marking too many words in a day', () => {
    const r = markMisheard({
      analysis: tryOf(),
      wordIndexes: [3],
      markedToday: MISHEARD_LIMITS.maxPerDay,
    });
    expect(r).toEqual({ ok: false, reason: 'daily_limit_reached' });
    const edge = markMisheard({
      analysis: tryOf(),
      wordIndexes: [3],
      markedToday: MISHEARD_LIMITS.maxPerDay - 1,
    });
    expect(edge.ok).toBe(true);
  });
});

describe('correctedShare', () => {
  it('is zero for no marks and for an empty try', () => {
    expect(correctedShare(tryOf())).toBe(0);
    expect(correctedShare(summariseTry([], 0))).toBe(0);
  });

  it('is the marked share of the expected words', () => {
    const r = markMisheard({ analysis: tryOf(), wordIndexes: [3, 9], markedToday: 0 });
    if (!r.ok) throw new Error('expected ok');
    expect(correctedShare(r.record.analysis)).toBeCloseTo(0.2);
  });
});

describe('correction records', () => {
  const before = tryOf();
  const result = markMisheard({ analysis: before, wordIndexes: [3, 9], markedToday: 0 });
  if (!result.ok) throw new Error('expected ok');
  const input = {
    tryId: 'try-1',
    actor: { role: 'parent' as const, userId: 'user-9' },
    before,
    result,
  };

  it('writes a decision with counts and the corrected share', () => {
    const d = correctionDecision(input);
    expect(d.kind).toBe('analysis');
    expect(d.summary).toContain('A parent marked 2 words');
    expect(d.evidence).toMatchObject({
      tryId: 'try-1',
      markedBy: 'parent',
      wordsMarked: 2,
      wordsRightBefore: 8,
      wordsRightAfter: 10,
    });
  });

  it('names the learner role and the singular for one word', () => {
    const one = markMisheard({ analysis: before, wordIndexes: [3], markedToday: 0 });
    if (!one.ok) throw new Error('expected ok');
    const d = correctionDecision({
      ...input,
      actor: { role: 'learner', userId: 'user-1' },
      result: one,
    });
    expect(d.summary).toContain('The learner marked 1 word ');
  });

  it('writes an audit row with the actor and the try', () => {
    expect(correctionAudit(input)).toEqual({
      actorUserId: 'user-9',
      action: 'try.misheard',
      target: 'try:try-1',
    });
  });

  it('keeps words, names and audio out of the records', () => {
    const text = JSON.stringify([correctionDecision(input), correctionAudit(input)]);
    expect(text).not.toMatch(/w3|w9|audio|username/i);
  });
});
