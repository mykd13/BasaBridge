/**
 * Story generation with checks (docs/PLAN.md section 7). Owner: Jhade (BB-15 to BB-18).
 * Seed: the deterministic checks ported from the early prototype. Generation and the verifier are stubs.
 */
import type { Story, StoryQuestion } from '@basabridge/contracts';

export * from './checks';
export * from './retry';
export * from './review';
export * from './review-queue';
export * from './content-rates';

export interface GenerateStoryInput {
  level: number;
  /** Extra questions on this skill, chosen by code from the mastery estimates. */
  focus: StoryQuestion['skill'] | null;
  /** Titles to avoid repeating. */
  recentTitles: string[];
}

/** Implemented in BB-15 to BB-17: generate, run checkStory, run the independent verifier, retry. */
export async function generateStory(_input: GenerateStoryInput): Promise<Story> {
  throw new Error('generateStory is not implemented yet (BB-15)');
}
