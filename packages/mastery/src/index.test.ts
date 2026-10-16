import { describe, expect, it } from 'vitest';
import { estimateSkills, focusSkill, moveLevel } from './index';

const story = (...r: Array<['vocabulary' | 'literal' | 'inferential', boolean]>) => ({
  questions: r.map(([skill, correct]) => ({ skill, correct })),
});

describe('estimateSkills', () => {
  it('has no estimate before any answer', () => {
    const e = estimateSkills([]);
    expect(e.vocabulary.estimate).toBeNull();
    expect(e.vocabulary.confidence).toBe('none');
  });

  it('keeps one correct answer modest', () => {
    const e = estimateSkills([story(['literal', true])]);
    expect(e.literal.estimate).toBeCloseTo(2 / 3, 5);
    expect(e.literal.confidence).toBe('early');
  });

  it('counts recent stories more', () => {
    const improving = estimateSkills([
      story(['vocabulary', false], ['vocabulary', false]),
      story(['vocabulary', true], ['vocabulary', true]),
    ]);
    const worsening = estimateSkills([
      story(['vocabulary', true], ['vocabulary', true]),
      story(['vocabulary', false], ['vocabulary', false]),
    ]);
    expect(improving.vocabulary.estimate!).toBeGreaterThan(worsening.vocabulary.estimate!);
  });

  it('raises confidence with more questions', () => {
    const many = estimateSkills([
      story(...Array.from({ length: 10 }, () => ['literal', true] as ['literal', boolean])),
    ]);
    expect(many.literal.confidence).toBe('steady');
  });
});

describe('focusSkill', () => {
  it('picks the lowest measured estimate', () => {
    const e = estimateSkills([
      story(['vocabulary', false], ['literal', true], ['inferential', true]),
    ]);
    expect(focusSkill(e)).toBe('vocabulary');
  });

  it('is null when nothing is measured', () => {
    expect(focusSkill(estimateSkills([]))).toBeNull();
  });
});

describe('moveLevel', () => {
  it('moves up after three passes and resets the count', () => {
    let s = { level: 24, passes: 0 };
    for (let i = 0; i < 2; i++) {
      const m = moveLevel(s, true, false);
      expect(m.moved).toBe('none');
      s = m;
    }
    const up = moveLevel(s, true, false);
    expect(up).toEqual({ level: 25, passes: 0, moved: 'up' });
  });

  it('stays on a normal non-pass', () => {
    expect(moveLevel({ level: 24, passes: 1 }, false, false)).toEqual({
      level: 24,
      passes: 1,
      moved: 'none',
    });
  });

  it('moves down on a very weak result but never below level 1', () => {
    expect(moveLevel({ level: 24, passes: 2 }, false, true)).toEqual({
      level: 23,
      passes: 0,
      moved: 'down',
    });
    expect(moveLevel({ level: 1, passes: 0 }, false, true).level).toBe(1);
  });

  it('never goes above level 100', () => {
    expect(moveLevel({ level: 100, passes: 2 }, true, false).level).toBe(100);
  });
});
