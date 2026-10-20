import { describe, expect, it } from 'vitest';
import { AVOID_TOPICS, CONTENT_RULES, GOOD_TOPICS, LOCAL_WORDS } from './guidelines';

describe('content guidelines data', () => {
  it('has topics to use, topics to avoid and rules', () => {
    expect(GOOD_TOPICS.length).toBeGreaterThanOrEqual(10);
    expect(AVOID_TOPICS.length).toBeGreaterThanOrEqual(5);
    expect(CONTENT_RULES.length).toBeGreaterThanOrEqual(5);
  });

  it('has no repeated topics', () => {
    expect(new Set(GOOD_TOPICS).size).toBe(GOOD_TOPICS.length);
    expect(new Set(AVOID_TOPICS).size).toBe(AVOID_TOPICS.length);
  });

  it('keeps local words lowercase and free of spaces', () => {
    for (const w of LOCAL_WORDS) expect(w).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
  });

  it('cannot be changed at run time', () => {
    expect(Object.isFrozen(GOOD_TOPICS)).toBe(true);
    expect(Object.isFrozen(AVOID_TOPICS)).toBe(true);
  });
});
