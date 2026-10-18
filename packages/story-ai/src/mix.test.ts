import { ComprehensionSkill } from '@basabridge/contracts';
import { QUESTIONS_PER_STORY } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { skillMix } from './mix';

describe('skillMix', () => {
  it('asks QUESTIONS_PER_STORY questions', () => {
    expect(skillMix(null)).toHaveLength(QUESTIONS_PER_STORY);
  });

  it('spreads the extras over literal and inferential with no focus', () => {
    expect(skillMix(null)).toEqual([
      'vocabulary',
      'literal',
      'inferential',
      'literal',
      'inferential',
    ]);
  });

  it.each(ComprehensionSkill.options)('puts every extra question on the %s focus', (focus) => {
    const mix = skillMix(focus);
    expect(mix.slice(0, 3)).toEqual(['vocabulary', 'literal', 'inferential']);
    expect(mix.slice(3).every((s) => s === focus)).toBe(true);
    expect(mix.filter((s) => s === focus).length).toBe(1 + QUESTIONS_PER_STORY - 3);
  });

  it('handles counts below the base set', () => {
    expect(skillMix('inferential', 2)).toEqual(['vocabulary', 'literal']);
  });
});
