import { describe, expect, it } from 'vitest';
import { STANDARD_ACTIVITIES, isValidNotes, standardActivity } from './index';

describe('standard activities', () => {
  it('exist for every comprehension skill and never use AI wording', () => {
    for (const a of Object.values(STANDARD_ACTIVITIES)) {
      expect(a.source).toBe('standard');
      expect(a.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('falls back to the literal activity when there is no focus', () => {
    expect(standardActivity(null)).toBe(STANDARD_ACTIVITIES.literal);
  });
});

describe('isValidNotes', () => {
  const good = {
    childMessage: 'Nice reading today.',
    whatHappened: 'Four of five correct.',
    whyFocus: 'Vocabulary is the lowest so far.',
    homeActivity: { title: 'Word detective', minutes: 5, steps: ['a', 'b'], tip: 'tip' },
  };

  it('accepts a well-formed reply', () => {
    expect(isValidNotes(good)).toBe(true);
  });

  it('rejects missing, empty or oversized fields', () => {
    expect(isValidNotes(null)).toBe(false);
    expect(isValidNotes({ ...good, childMessage: '' })).toBe(false);
    expect(isValidNotes({ ...good, childMessage: 'x'.repeat(400) })).toBe(false);
    expect(
      isValidNotes({ ...good, homeActivity: { ...good.homeActivity, steps: ['only one'] } }),
    ).toBe(false);
  });
});
