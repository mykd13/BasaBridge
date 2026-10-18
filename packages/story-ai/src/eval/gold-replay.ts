/**
 * Adapters that need no model (BB-21 part 1). "Generation" replays a gold passage from the same
 * tier, the checks are the real `checkStory`, and the verifier is a stub that agrees with every key
 * and flags nothing. Use them to try the harness end to end. Their numbers say nothing about a model:
 * the stub verifier catches nothing, so a gold-replay run always fails the gate.
 */
import { tierFor } from '@basabridge/levels';
import { checkStory } from '../index';
import type { GoldCase, GoldStory } from './gold/schema';
import { type CheckOutcome, GOLD_REPLAY, UNPRICED } from './run';
import type { EvalAdapters } from './runner';

export function checkWithCurrentRules(story: GoldStory): CheckOutcome {
  const result = checkStory(story.text, story.questions, story.level);
  return result.ok
    ? { passed: true, failures: [] }
    : { passed: false, failures: [...new Set(result.failures.map((f) => f.code))] };
}

/** Unreviewed drafts are left out of the replay pool unless `includeDrafts` is set. */
export function goldReplayAdapters(cases: GoldCase[], includeDrafts = false): EvalAdapters {
  const pool = cases.filter(
    (c) => !c.unsafe && c.wrongKeys.length === 0 && (includeDrafts || c.reviewedBy !== null),
  );
  return {
    name: GOLD_REPLAY,
    storyModel: null,
    verifierModel: null,
    promptVersion: null,
    async generate({ level, index }) {
      const tier = tierFor(level);
      const inTier = pool.filter((c) => tierFor(c.story.level) === tier);
      const picked = inTier[index % Math.max(1, inTier.length)];
      if (!picked) return { ok: false, error: 'no_gold_passage', cost: UNPRICED };
      return { ok: true, story: { ...picked.story, level }, cost: UNPRICED };
    },
    check: checkWithCurrentRules,
    async verify() {
      return { error: null, disagreed: [], flaggedUnsafe: false, cost: UNPRICED };
    },
  };
}
