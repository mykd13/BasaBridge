import { timingSafeEqual } from 'node:crypto';

/** The caller's address as Vercel reports it. Used only as a rate limit subject, then hashed. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * True when the request carries `Authorization: Bearer <secret>`. A missing or short secret
 * refuses everyone, so an unset variable never opens the route.
 */
export function hasBearer(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get('authorization') ?? '';
  const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The rate limit subject for a request. With no forwarded address (it should always be present
 * on Vercel) callers are split by user agent, so one anonymous bucket is not shared by everyone.
 */
export function clientSubject(request: Request): string {
  const ip = clientIp(request);
  if (ip !== 'unknown') return ip;
  return `unknown:${(request.headers.get('user-agent') ?? '').slice(0, 120)}`;
}

/**
 * True for a request from this site's own pages. Browsers send Origin on POST and
 * Sec-Fetch-Site on every request; a request that claims another origin is refused. Requests with
 * neither header (curl, scripts) are allowed, so the rate limit is the only guard against them.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}
