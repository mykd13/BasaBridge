const NOT_WIRED_MARKER = 'NOT_WIRED';

/**
 * Thrown by code that is a stub until another issue lands. Route error boundaries show
 * a "not ready yet" message for it instead of a generic failure.
 */
export class NotWiredError extends Error {
  constructor(what: string) {
    super(`${NOT_WIRED_MARKER}: ${what}`);
    this.name = 'NotWiredError';
  }
}

/**
 * True for a NotWiredError, including one that crossed the server to client boundary.
 * Next rebuilds server errors on the client, so `instanceof` is not enough. In production
 * Next also replaces the message of a server error, so this only recognises it in development
 * and when thrown in a client component. The generic message is the safe fallback.
 */
export function isNotWired(error: unknown): boolean {
  if (error instanceof NotWiredError) return true;
  return error instanceof Error && error.message.startsWith(`${NOT_WIRED_MARKER}:`);
}
