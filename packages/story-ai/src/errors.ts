import type { Story } from '@basabridge/contracts';

/**
 * Why story generation failed.
 * - config: the model name or gateway key is missing or malformed.
 * - model_call: the provider call threw (network, quota, auth).
 * - invalid_output: the model answered, but not in the shape we asked for.
 * - checks_failed: the story broke a deterministic rule (length, grade, questions, repeat title).
 */
export type StoryErrorKind = 'config' | 'model_call' | 'invalid_output' | 'checks_failed';

export interface StoryError {
  kind: StoryErrorKind;
  /** Plain English, safe to show a developer. Never holds prompt text, learner data or a key. */
  reason: string;
}

/**
 * What generating one story cost, summed over every attempt. Tokens and cost are left out when
 * the provider did not report them, so a missing number is never logged as zero.
 */
export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  /** US dollars, as reported by the AI Gateway. */
  costUsd?: number;
  /** Model calls made, including failed ones. 0 when generation failed before any call. */
  attempts: number;
}

/** A complete story or a typed error, with usage either way. A partial story is never returned. */
export type StoryOutcome =
  { ok: true; story: Story; usage: Usage } | { ok: false; error: StoryError; usage: Usage };

export const fail = (kind: StoryErrorKind, reason: string): { ok: false; error: StoryError } => ({
  ok: false,
  error: { kind, reason },
});
