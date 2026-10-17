/**
 * A small per-client limit for the speech route. It stops casual abuse on one server instance.
 * Real limits and budgets belong to BB-39, and a signed-in session check to BB-10.
 */
const windows = new Map<string, { start: number; count: number }>();

export function allowRequest(
  key: string,
  limit = 30,
  windowMs = 60_000,
  now = Date.now(),
): boolean {
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    if (windows.size > 5000) {
      for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
    }
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export function resetRateLimits(): void {
  windows.clear();
}
