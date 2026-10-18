/**
 * Story generation with checks (docs/PLAN.md section 7). Owner: Jhade (BB-15 to BB-18).
 * Seed: the deterministic checks ported from the early prototype. Generation and the verifier are stubs.
 */
import type { StoryQuestion } from '@basabridge/contracts';
import type { TaggedStory } from './tags';

export * from './checks';
export * from './prompt';
export * from './retry';
export * from './rows';
export * from './tags';
export * from './verifier';

export interface GenerateStoryInput {
  level: number;
  /** Extra questions on this skill, chosen by code from the mastery estimates. */
  focus: StoryQuestion['skill'] | null;
  /** Titles to avoid repeating. */
  recentTitles: string[];
}

/**
 * Implemented in BB-15 to BB-17: generate, run checkStory, run the independent verifier, retry.
 * Returns a `TaggedStory`, not the contracts `Story`, so the question tags are not stripped.
 */
export async function generateStory(_input: GenerateStoryInput): Promise<TaggedStory> {
  throw new Error('generateStory is not implemented yet (BB-15)');
}
