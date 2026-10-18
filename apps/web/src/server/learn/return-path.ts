/** Where a lesson may send the learner back to. Anything else is ignored, so `return` is no open redirect. */
export const RETURN_ALLOW_LIST = ['/read/questions', '/read/result', '/learn'] as const;

export function safeReturnPath(value: string | string[] | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return (RETURN_ALLOW_LIST as readonly string[]).includes(value) ? value : null;
}

/** `/learn/[lesson]` with the return path carried along, when it is a safe one. */
export function lessonHref(lessonId: string, returnTo?: string | null, tail = ''): string {
  const base = `/learn/${encodeURIComponent(lessonId)}${tail}`;
  const safe = safeReturnPath(returnTo);
  return safe ? `${base}?return=${encodeURIComponent(safe)}` : base;
}
