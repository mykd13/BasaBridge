/**
 * Story generation with checks (docs/PLAN.md section 7). Owner: Jhade (BB-15 to BB-18).
 * The deterministic checks ported from the early prototype, and story generation (generate.ts).
 */

export * from './checks';
export * from './retry';

// Generation (BB-15). The independent verifier (BB-17) runs after it.
export { acceptStory, generateStory, GeneratedStory } from './generate';
export type {
  Accepted,
  GenerateStoryInput,
  GenerateStoryOptions,
  GenerationFailure,
} from './generate';
export type { StoryError, StoryErrorKind, StoryOutcome, Usage } from './errors';
export { loadStoryConfig } from './config';
export { skillMix } from './mix';
export { isRecentTitle, isTopicSeed, pickTopic, TOPIC_SEEDS } from './topics';
