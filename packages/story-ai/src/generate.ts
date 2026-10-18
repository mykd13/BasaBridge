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
import { loadStoryConfig } from './config';
import { checkStory } from './checks';
import { fail, type StoryError, type StoryOutcome, type Usage } from './errors';
import { skillMix } from './mix';
import { buildStoryPrompt } from './prompt';
import { failureFeedback } from './retry';
import { isRecentTitle, pickTopic } from './topics';
import { addCall } from './usage';

export interface GenerateStoryInput {
  level: number;
  /** Extra questions on this skill, chosen by code from the mastery estimates. */
  focus: ComprehensionSkill | null;
  /** Titles to avoid repeating. */
  recentTitles: string[];
  /** Topic seed chosen by the caller (the story bank). Picked from TOPIC_SEEDS when missing. */
  topic?: string;
  /** Topics used lately, most recent first. Used only when `topic` is missing. */
  recentTopics?: string[];
}

export interface GenerateStoryOptions {
  /** Defaults to process.env. Only STORY_MODEL and AI_GATEWAY_API_KEY are read. */
  env?: Record<string, string | undefined>;
  /** Replaces the gateway model, for tests. The config is still checked. */
  model?: LanguageModel;
  /** Model calls allowed when the output is invalid or fails the checks. Default 3. */
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

type Attempt = { ok: true; story: Story } | { ok: false; error: StoryError };

/** Runs the deterministic checks and the shared schema on one model answer. */
export function acceptStory(out: GeneratedStory, level: number, recentTitles: string[]): Attempt {
  const title = out.title.trim();
  if (title === '') return fail('invalid_output', 'The story had no title.');
  if (isRecentTitle(title, recentTitles)) {
    return fail('checks_failed', 'The title repeats a recent story. Use a new title.');
  }
  const checked = checkStory(out.text, out.questions, level);
  if (!checked.ok) return fail('checks_failed', failureFeedback(checked.failures));
  const parsed = StorySchema.safeParse({
    title,
    text: out.text.trim(),
    level,
    words: checked.words,
    readingGrade: checked.readingGrade,
    questions: checked.questions,
  });
  if (!parsed.success) return fail('invalid_output', 'The story did not match the Story shape.');
  return { ok: true, story: parsed.data };
}

/**
 * Generates one story through the AI Gateway (docs/PLAN.md section 7, ADR 0002): builds the
 * prompt from the level, a topic and a skill mix chosen by code, asks for JSON in the
 * GeneratedStory shape, then runs the checks. Invalid output or a failed check is retried with the
 * reason, up to `maxAttempts` calls. A config error or a failed call stops at once.
 * Never throws and never returns a partial story. Usage covers every call made.
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
  const config = loadStoryConfig(options.env);
  if (!config.ok) return stop(config.error);

  const tier = tierFor(input.level);
  const topic = input.topic?.trim() || pickTopic(input.recentTopics ?? [], options.random);
  const mix = skillMix(input.focus);
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 3));

  let last: StoryError = { kind: 'invalid_output', reason: 'No attempt was made.' };
  for (let i = 0; i < maxAttempts; i++) {
    const { system, prompt } = buildStoryPrompt({
      level: input.level,
      tier,
      topic,
      mix,
      recentTitles: input.recentTitles,
      ...(i > 0 ? { retryReason: last.reason } : {}),
    });

    let out: GeneratedStory;
    try {
      const result = await generateText({
        model: options.model ?? config.config.model,
        system,
        prompt,
        output: Output.object({ schema: GeneratedStory, name: 'story' }),
      });
      usage = addCall(usage, result);
      out = result.output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        usage = addCall(usage, { usage: err.usage });
        last = { kind: 'invalid_output', reason: 'The reply did not match the story shape.' };
        continue;
      }
      usage = addCall(usage, {});
      // The SDK message can name the model or the HTTP status, never the prompt or the key.
      const name = err instanceof Error ? err.name : 'Error';
      return stop({ kind: 'model_call', reason: `The model call failed (${name}).` });
    }

    const attempt = acceptStory(out, input.level, input.recentTitles);
    if (attempt.ok) return { ok: true, story: attempt.story, usage };
    last = attempt.error;
  }
  return stop(last);
}
