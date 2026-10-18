/**
 * A small per-client limit for the speech route. It is per server instance and keyed on a header
 * the caller may control, so it is a best-effort extra, not the abuse control. The route only
 * speaks fixed sentences for that. Real limits and budgets belong to BB-39, sessions to BB-10.
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
      // A flood of fresh keys inside one window: start over rather than scan on every request.
      if (windows.size > 5000) windows.clear();
    }
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function clientKey(request: Request): string {
  // Best effort: these headers are only trustworthy when the host sets them.
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function resetRateLimits(): void {
  windows.clear();
}
