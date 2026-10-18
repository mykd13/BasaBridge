/**
 * The model call for teacher notes. It goes through the Vercel AI Gateway with a plain
 * `provider/model` string from NOTES_MODEL (ADR 0002). Model names are never written in code.
 */
import { generateText, type LanguageModel, Output } from 'ai';
import type { NotesPrompt } from './prompt';
import { ModelNotes } from './schema';

/** Returns the model's raw reply. Callers check it before trusting it. */
export type NotesModel = (prompt: NotesPrompt) => Promise<unknown>;

/** A small, fast model is enough, so a slow reply means something is wrong. This is the total for the call, retries included. */
export const NOTES_TIMEOUT_MS = 10_000;

/** `model` is an AI Gateway string such as the value of NOTES_MODEL, or a model object in tests. */
export function gatewayNotesModel(model: LanguageModel, timeoutMs = NOTES_TIMEOUT_MS): NotesModel {
  return async ({ instructions, prompt }) => {
    const result = await generateText({
      model,
      instructions,
      prompt,
      output: Output.object({ schema: ModelNotes, name: 'teacher_notes' }),
      timeout: { totalMs: timeoutMs },
      maxRetries: 1,
    });
    return result.output;
  };
}

/** The configured notes model, or null when NOTES_MODEL is not set. */
export function notesModelFromEnv(
  env: Record<string, string | undefined> = processEnv(),
): NotesModel | null {
  const id = env.NOTES_MODEL?.trim();
  return id ? gatewayNotesModel(id) : null;
}

function processEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}
