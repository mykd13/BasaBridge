import { describe, expect, it } from 'vitest';
import { EVIDENCE_RULE } from './evidence';

describe('calibration rule', () => {
  const c = EVIDENCE_RULE.calibration;

  it('needs a real sample before changing or retiring a question', () => {
    expect(c.minAnswers).toBeGreaterThanOrEqual(30);
    expect(c.priorWeight).toBeGreaterThan(0);
    expect(c.priorWeight).toBeLessThan(c.minAnswers);
  });

  it('keeps the too easy and too hard cut-offs apart and inside 0 to 1', () => {
    expect(c.tooEasy).toBeGreaterThan(0.5);
    expect(c.tooEasy).toBeLessThanOrEqual(1);
    expect(c.tooHard).toBeGreaterThanOrEqual(0);
    expect(c.tooHard).toBeLessThan(0.5);
  });

  it('retires questions unrelated or negatively related to ability', () => {
    expect(c.minCorrelation).toBeGreaterThanOrEqual(-1);
    expect(c.minCorrelation).toBeLessThan(1);
  });

  it('has a sub-skill offset for every sub-skill it may suggest one for', () => {
    expect(c.minItemsPerSubskill).toBeGreaterThan(0);
    expect(Object.keys(EVIDENCE_RULE.subskillOffset)).toHaveLength(9);
  });
});
