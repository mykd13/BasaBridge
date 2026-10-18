/**
 * What may be logged about an uncaught server error (BB-39). Only the error class and the
 * digest Next assigns. The message and stack are never logged: a zod or provider error can
 * embed story text, a username or a transcript, and the redactor cannot know which words those
 * are (golden rule 2).
 */
export function safeErrorFields(error: unknown): { errorClass: string; digest?: string } {
  const e = error as { name?: unknown; digest?: unknown } | null;
  const name =
    typeof e?.name === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(e.name) ? e.name : 'Error';
  const digest = typeof e?.digest === 'string' ? e.digest.slice(0, 64) : undefined;
  return { errorClass: name, digest };
}
