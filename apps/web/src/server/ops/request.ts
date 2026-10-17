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
