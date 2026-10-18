import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Recovery codes for learners with no email and no linked parent (BB-62).
 *
 * A code is shown once and never stored. Only a salted scrypt hash is kept, so nobody can read a
 * code back, not even us. The alphabet leaves out characters a child could mix up (0 and O,
 * 1, I and L, and U and V), so 16 characters carry about 78 bits.
 */
export const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTWXYZ';
export const RECOVERY_CODE_LENGTH = 16;
const GROUP_SIZE = 4;

/** scrypt cost. 2^15 takes a few tens of milliseconds, which is fine for a rare action. */
const SCRYPT: ScryptOptions & { N: number; r: number; p: number } = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const HASH_PREFIX = 'scrypt';

/** A new code in plain form, without separators. randomInt is unbiased for any range. */
export function generateCode(): string {
  let code = '';
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i++) {
    code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  }
  return code;
}

/** For display: four groups of four, joined by dashes. */
export function formatCode(code: string): string {
  const groups: string[] = [];
  for (let i = 0; i < code.length; i += GROUP_SIZE) groups.push(code.slice(i, i + GROUP_SIZE));
  return groups.join('-');
}

/**
 * What the learner typed, made comparable: case, spaces and dashes are ignored. Returns null
 * when the result cannot be a code, so callers can refuse it before any hashing.
 */
export function normalizeCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== RECOVERY_CODE_LENGTH) return null;
  for (const ch of code) if (!RECOVERY_ALPHABET.includes(ch)) return null;
  return code;
}

function derive(code: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(code, salt, KEY_LENGTH, SCRYPT, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** The stored form: `scrypt$N$r$p$salt$hash`, with salt and hash in base64url. */
export async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(code, salt);
  return [
    HASH_PREFIX,
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

/**
 * True when the typed code matches the stored hash. The typed code is normalized first. A
 * malformed hash or code is a plain false, never a throw, so every failure looks the same.
 */
export async function verifyCode(raw: string, stored: string): Promise<boolean> {
  const code = normalizeCode(raw);
  if (!code) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== HASH_PREFIX) return false;
  const [, n, r, p, saltText, keyText] = parts;
  // Only the cost we write is accepted, so a tampered row cannot ask for a huge scrypt run.
  if (Number(n) !== SCRYPT.N || Number(r) !== SCRYPT.r || Number(p) !== SCRYPT.p) return false;
  const expected = Buffer.from(keyText!, 'base64url');
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await derive(code, Buffer.from(saltText!, 'base64url'));
  return timingSafeEqual(actual, expected);
}
