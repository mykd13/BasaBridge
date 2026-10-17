/**
 * Log redaction (BB-39). Golden rule 2: no names, usernames, emails, passwords, audio,
 * transcripts, story text or answers in any log. Every log line goes through `redact` first.
 *
 * This file has no Node imports so the browser error reporter can use it too.
 */

/** Keys that are always removed, compared after lowercasing and dropping `_` and `-`. */
const FORBIDDEN_KEYS = new Set([
  'name',
  'firstname',
  'lastname',
  'fullname',
  'displayname',
  'nickname',
  'username',
  'user',
  'email',
  'phone',
  'password',
  'passwordhash',
  'audio',
  'recording',
  'blob',
  'transcript',
  'heard',
  'words',
  'answer',
  'answers',
  'chosen',
  'options',
  'text',
  'passage',
  'story',
  'storytext',
  'title',
  'question',
  'questions',
  'evidence',
  'prompt',
  'instructions',
  'output',
  'body',
  'token',
  'secret',
  'authorization',
  'cookie',
  'cookies',
  'ip',
  'address',
]);

/** Keys ending in one of these are removed too, such as `learnerName` or `guardianEmail`. */
const FORBIDDEN_SUFFIXES = [
  'firstname',
  'lastname',
  'fullname',
  'childname',
  'learnername',
  'studentname',
  'parentname',
  'guardianname',
  'username',
  'email',
  'password',
  'audio',
  'transcript',
  'answer',
  'answers',
  'token',
  'secret',
];

export const REDACTED = '[redacted]';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /\bbearer\s+[A-Za-z0-9._~+/=-]+/gi;
const MAX_STRING = 500;
const MAX_ARRAY = 20;
const MAX_DEPTH = 5;

export function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[_-]/g, '');
  return FORBIDDEN_KEYS.has(k) || FORBIDDEN_SUFFIXES.some((s) => k.endsWith(s));
}

/** Removes emails and bearer tokens from free text, then caps its length. */
export function scrubString(s: string): string {
  const clean = s.replace(EMAIL, '[email]').replace(BEARER, 'Bearer [token]');
  return clean.length > MAX_STRING ? `${clean.slice(0, MAX_STRING)}...` : clean;
}

/**
 * Returns a copy that is safe to log. Forbidden keys are replaced with `[redacted]`, strings are
 * scrubbed, binary data is dropped, and deep or long structures are cut short.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message),
      stack: value.stack ? scrubString(value.stack) : undefined,
    };
  }
  if (isBinary(value)) return REDACTED;
  if (depth >= MAX_DEPTH) return '[deep]';
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((v) => redact(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isForbiddenKey(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

function isBinary(value: unknown): boolean {
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return true;
  const B = (globalThis as { Blob?: new () => object }).Blob;
  return !!B && value instanceof B;
}
