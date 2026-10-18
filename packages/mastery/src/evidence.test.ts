import { describe, expect, it } from 'vitest';
import { countsAsLevelEvidence, countsForLevelMovement } from './evidence';

describe('countsAsLevelEvidence', () => {
  it('lets only real story answers move the level', () => {
    expect(countsAsLevelEvidence('story')).toBe(true);
    expect(countsAsLevelEvidence('learn')).toBe(false);
    expect(countsAsLevelEvidence('placement')).toBe(false);
  });
});

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
