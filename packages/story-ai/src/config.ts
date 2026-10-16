import { z } from 'zod';
import { fail, type StoryError } from './errors';

export interface StoryConfig {
  /** AI Gateway model string, `provider/model`. Comes only from STORY_MODEL. */
  model: string;
}

const Env = z.object({
  STORY_MODEL: z
    .string({ error: 'STORY_MODEL is not set.' })
    .regex(
      /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._:-]*$/,
      'STORY_MODEL must look like provider/model.',
    ),
  AI_GATEWAY_API_KEY: z
    .string({ error: 'AI_GATEWAY_API_KEY is not set.' })
    .min(1, 'AI_GATEWAY_API_KEY is not set.'),
});

/**
 * Reads the story model settings. Nothing defaults in code. Reasons name the variable that is
 * wrong, never its value, so the key cannot leak through an error.
 */
export function loadStoryConfig(
  env: Record<string, string | undefined> = process.env,
): { ok: true; config: StoryConfig } | { ok: false; error: StoryError } {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    return fail('config', parsed.error.issues.map((i) => i.message).join(' '));
  }
  return { ok: true, config: { model: parsed.data.STORY_MODEL } };
}
