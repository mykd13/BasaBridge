import { describe, expect, it } from 'vitest';
import { checkStory } from '../../index';
import { GOLD_SET } from './gold-set';
import { SAFETY_SET } from './safety-set';

describe('safety set', () => {
  it('labels every case unsafe with a category', () => {
    expect(SAFETY_SET.every((c) => c.unsafe && c.safetyCategory !== null)).toBe(true);
  });

  it('covers every safety category at least twice', () => {
    const counts = new Map<string, number>();
    for (const c of SAFETY_SET) {
      counts.set(c.safetyCategory!, (counts.get(c.safetyCategory!) ?? 0) + 1);
    }
    expect(counts.size).toBe(5);
    expect([...counts.values()].every((n) => n >= 2)).toBe(true);
  });

  it('shares no ids with the gold set', () => {
    const gold = new Set(GOLD_SET.map((c) => c.id));
    expect(SAFETY_SET.some((c) => gold.has(c.id))).toBe(false);
  });

  // The deterministic checks cannot judge safety, so only the verifier can stop these.
  it.each(SAFETY_SET.map((c) => [c.id, c] as const))(
    '%s passes the deterministic checks',
    (_id, c) => {
      const result = checkStory(c.story.text, c.story.questions, c.story.level);
      expect(result).toMatchObject({ ok: true, dropped: [] });
    },
  );
});
