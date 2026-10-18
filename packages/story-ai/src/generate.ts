import {
  type ComprehensionSkill,
  Level,
  type Story,
  StoryQuestion,
  Story as StorySchema,
} from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';
import { generateText, type LanguageModel, NoObjectGeneratedError, Output } from 'ai';
import { z } from 'zod';
import { type CheckFailure, checkStory } from './checks';
import { loadStoryConfig } from './config';
import type { StoryError, StoryOutcome, Usage } from './errors';
import { skillMix } from './mix';
import { buildStoryPrompt } from './prompt';
import { MAX_STORY_TRIES, runWithChecks } from './retry';
import { isRecentTitle, isTopicSeed, pickTopic } from './topics';
import { addCall } from './usage';

export interface GenerateStoryInput {
  level: number;
  /** Extra questions on this skill, chosen by code from the mastery estimates. */
  focus: ComprehensionSkill | null;
  /** Titles to avoid repeating. Checked in code only; never sent to the model. */
  recentTitles: string[];
  /** One of TOPIC_SEEDS, chosen by the caller (the story bank). Picked here when missing. */
  topic?: string;
  /** Topics used lately, most recent first. Used only when `topic` is missing. Never sent. */
  recentTopics?: string[];
}

export interface GenerateStoryOptions {
  /** Defaults to process.env. Only STORY_MODEL and AI_GATEWAY_API_KEY are read. */
  env?: Record<string, string | undefined>;
  /** Replaces the gateway model, for tests. The config is still checked. */
  model?: LanguageModel;
  /** Model calls allowed when the output is invalid or fails the checks. Default MAX_STORY_TRIES. */
  maxAttempts?: number;
  random?: () => number;
}

/** What the model must return. Checked again by checkStory and the Story schema afterwards. */
export const GeneratedStory = z.object({
  title: z.string(),
  text: z.string(),
  questions: z.array(StoryQuestion),
});
export type GeneratedStory = z.infer<typeof GeneratedStory>;

/**
 * A failure on one model answer. The check codes come from checkStory; the others are found
 * here. Messages are fixed wording with counts only, so they are safe to send back as feedback.
 */
export interface GenerationFailure extends Omit<CheckFailure, 'code'> {
  code: CheckFailure['code'] | 'reply_not_story' | 'no_title' | 'repeat_title' | 'shape_mismatch';
}

/** Failures that mean the reply was malformed, reported as invalid_output. */
const OUTPUT_CODES: ReadonlySet<GenerationFailure['code']> = new Set([
  'reply_not_story',
  'no_title',
  'shape_mismatch',
]);

const failed = (code: GenerationFailure['code'], message: string) => ({
  ok: false as const,
  failures: [{ code, message }],
});

export type Accepted = { ok: true; story: Story } | { ok: false; failures: GenerationFailure[] };

/**
 * Runs the deterministic checks and the shared schema on one model answer. `null` means the
 * reply was not in the GeneratedStory shape.
 */
export function acceptStory(
  out: GeneratedStory | null,
  level: number,
  recentTitles: string[],
): Accepted {
  if (out === null) return failed('reply_not_story', 'The reply did not match the story shape.');
  const title = out.title.trim();
  if (title === '') return failed('no_title', 'The story had no title.');
  if (isRecentTitle(title, recentTitles)) {
    return failed('repeat_title', 'The title repeats a recent story. Use a new title.');
  }
  const checked = checkStory(out.text, out.questions, level);
  if (!checked.ok) return { ok: false, failures: checked.failures };
  const parsed = StorySchema.safeParse({
    title,
    text: out.text.trim(),
    level,
    words: checked.words,
    readingGrade: checked.readingGrade,
    questions: checked.questions,
  });
  if (!parsed.success) return failed('shape_mismatch', 'The story did not match the Story shape.');
  return { ok: true, story: parsed.data };
}

/** Thrown inside an attempt when the provider call fails. Holds only the error's class name. */
class ModelCallFailed extends Error {}

/**
 * Generates one story through the AI Gateway (docs/PLAN.md section 7, ADR 0002): builds the
 * prompt from the level, a topic seed and a skill mix chosen by code, asks for JSON in the
 * GeneratedStory shape, then runs the checks. runWithChecks retries invalid output or a failed
 * check with feedback built from failure codes and counts, up to `maxAttempts` calls.
 * A config error or a failed call stops at once. SDK retries are off, so every call made is a
 * counted attempt with its tokens and cost in `usage`; the story bank retries later instead.
 * Never throws and never returns a partial story.
 */
export async function generateStory(
  input: GenerateStoryInput,
  options: GenerateStoryOptions = {},
): Promise<StoryOutcome> {
  let usage: Usage = { attempts: 0 };
  const stop = (error: StoryError): StoryOutcome => ({ ok: false, error, usage });

  if (!Level.safeParse(input.level).success) {
    return stop({ kind: 'config', reason: 'The level must be a whole number from 1 to 100.' });
  }
  // Model-bound input (golden rule 2): the topic is the only caller text in the prompt, so it
  // must be a known seed.
  if (input.topic !== undefined && !isTopicSeed(input.topic)) {
    return stop({ kind: 'config', reason: 'The topic must be one of TOPIC_SEEDS.' });
  }
  const config = loadStoryConfig(options.env);
  if (!config.ok) return stop(config.error);

  const tier = tierFor(input.level);
  const topic = input.topic ?? pickTopic(input.recentTopics ?? [], options.random);
  const mix = skillMix(input.focus);

  const attempt = async (retryReason?: string): Promise<GeneratedStory | null> => {
    const { system, prompt } = buildStoryPrompt({
      level: input.level,
      tier,
      topic,
      mix,
      ...(retryReason ? { retryReason } : {}),
    });
    try {
      const result = await generateText({
        model: options.model ?? config.config.model,
        system,
        prompt,
        output: Output.object({ schema: GeneratedStory, name: 'story' }),
        maxRetries: 0,
      });
      usage = addCall(usage, result);
      return result.output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        usage = addCall(usage, { usage: err.usage });
        return null;
      }
      usage = addCall(usage, {});
      // The SDK message can name the model or the HTTP status, never the prompt or the key.
      throw new ModelCallFailed(err instanceof Error ? err.name : 'Error');
    }
  };

  try {
    const run = await runWithChecks({
      attempt,
      check: (out) => acceptStory(out, input.level, input.recentTitles),
      maxTries: options.maxAttempts ?? MAX_STORY_TRIES,
    });
    if (run.ok) return { ok: true, story: run.checked.story, usage };
    const kind = run.failures.every((f) => OUTPUT_CODES.has(f.code))
      ? 'invalid_output'
      : 'checks_failed';
    return stop({ kind, reason: run.failures.map((f) => f.message).join(' ') });
  } catch (err) {
    if (err instanceof ModelCallFailed) {
      return stop({ kind: 'model_call', reason: `The model call failed (${err.message}).` });
    }
    throw err;
  }
}
