/**
 * Teacher notes written by the AI from facts that code has already worked out
 * (docs/PLAN.md section 7). Owner: Jhade (BB-20, BB-28).
 * Names, usernames and audio are never sent to the model.
 */
import { ModelNotes, NotesInput, type TeacherNotes } from './schema';

export * from './schema';
export * from './standard';

/** Shape and length check for model output. Anything that fails falls back to standard wording. */
export function isValidNotes(p: unknown): boolean {
  return ModelNotes.safeParse(p).success;
}

/** Implemented in BB-20: call the model, validate with isValidNotes, fall back to standard wording. */
export async function writeNotes(input: NotesInput): Promise<TeacherNotes> {
  NotesInput.parse(input);
  throw new Error('writeNotes is not implemented yet (BB-20)');
}
