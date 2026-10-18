import { describe, expect, it } from 'vitest';
import { countsForLevelMovement } from './evidence';

describe('countsForLevelMovement', () => {
  it('holds a try that needs review out of level movement', () => {
    expect(countsForLevelMovement({ conditions: [], review: 'needs_review' })).toBe(false);
  });

  it('counts confirmed tries', () => {
    expect(countsForLevelMovement({ conditions: [], review: 'confirmed' })).toBe(true);
  });

  it('counts tries with only conditions, and older tries without checks', () => {
    expect(countsForLevelMovement({ conditions: ['low_volume'], review: 'none' })).toBe(true);
    expect(countsForLevelMovement(undefined)).toBe(true);
  });
});
