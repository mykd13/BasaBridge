/**
 * The next story for a learner (docs/PLAN.md section 6, BB-36). The learner's level is the only
 * difficulty input, so every story is at the same difficulty until the level changes.
 * Pure: the store passes the stories it has.
 */
import { SessionError } from './machine';

/**
 * A story at the learner's level they have never had a session for.
 * Throws `no_story` when none is left, so the screen fails visibly instead of repeating a story.
 * Generating a new one when the bank runs out is added with BB-15.
 */
export function chooseStory(
  atLevel: readonly string[],
  seen: readonly string[],
  random: () => number = Math.random,
): string {
  const seenSet = new Set(seen);
  const fresh = atLevel.filter((id) => !seenSet.has(id));
  if (fresh.length === 0) throw new SessionError('no_story');
  return fresh[Math.min(fresh.length - 1, Math.floor(random() * fresh.length))]!;
}
