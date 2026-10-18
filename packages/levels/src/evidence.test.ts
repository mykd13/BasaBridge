import { describe, expect, it } from 'vitest';
import { EVIDENCE_RULE, SCORING_RULE } from './evidence';

describe('SCORING_RULE', () => {
  it('gives no partial credit, so the guess rates stay true', () => {
    expect(SCORING_RULE.partialCredit).toBe(false);
  });

  it('keeps the hard question types harder to guess than multiple choice', () => {
    const { guess } = EVIDENCE_RULE;
    expect(guess.choose_all).toBeLessThan(guess.multiple_choice);
    expect(guess.order_events).toBeLessThan(guess.choose_all);
  });
});
