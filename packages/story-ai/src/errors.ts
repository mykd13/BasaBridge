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

/** A complete story or a typed error. A partial story is never returned. */
export type StoryOutcome = { ok: true; story: Story } | { ok: false; error: StoryError };

export const fail = (kind: StoryErrorKind, reason: string): { ok: false; error: StoryError } => ({
  ok: false,
  error: { kind, reason },
});
