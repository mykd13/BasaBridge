/**
 * Adapters that need no model (BB-21 part 1). "Generation" replays a gold passage from the same
 * tier, the checks are the real `checkStory`, and the verifier is a stub that agrees with every key
 * and flags nothing. Use them to try the harness end to end. Their numbers say nothing about a model:
 * the stub verifier catches nothing, so a gold-replay run always fails the gate.
 */
import { tierFor } from '@basabridge/levels';
import { checkStory } from '../index';
import type { GoldCase, GoldStory } from './gold/schema';
import { type CheckOutcome, NO_COST } from './run';
import type { EvalAdapters } from './runner';

/** Gives the reason from checkStory a stable code, using the names the checks use in BB-16. */
export function failureCode(reason: string): string {
  const length = reason.match(/had (\d+) words but must have (\d+)-(\d+)/);
  if (length) return Number(length[1]) < Number(length[2]) ? 'too_short' : 'too_long';
  if (/too hard/.test(reason)) return 'too_hard';
  if (/valid questions/.test(reason)) return 'too_few_questions';
  return 'other';
}

export function checkWithCurrentRules(story: GoldStory): CheckOutcome {
  const result = checkStory(story.text, story.questions, story.level);
  return result.ok
    ? { passed: true, failures: [] }
    : { passed: false, failures: [failureCode(result.reason)] };
}

export function goldReplayAdapters(cases: GoldCase[]): EvalAdapters {
  const pool = cases.filter((c) => !c.unsafe && c.wrongKeys.length === 0);
  return {
    name: 'gold-replay',
    storyModel: null,
    verifierModel: null,
    promptVersion: null,
    async generate({ level, index }) {
      const tier = tierFor(level);
      const inTier = pool.filter((c) => tierFor(c.story.level) === tier);
      const picked = inTier[index % Math.max(1, inTier.length)];
      if (!picked)
        return { ok: false, error: `No gold passage for level ${level}.`, cost: NO_COST };
      return { ok: true, story: { ...picked.story, level }, cost: NO_COST };
    },
    check: checkWithCurrentRules,
    async verify() {
      return { error: null, disagreed: [], flaggedUnsafe: false, cost: NO_COST };
    },
  };
}
