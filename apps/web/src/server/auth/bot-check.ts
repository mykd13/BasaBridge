/**
 * Bot check for sign-up (BB-63). ALTCHA proof-of-work, self-hosted: the browser solves a small
 * puzzle in the background while the child fills in the form, with nothing to read or click.
 * No third party sees the request, so no new data processor is added (BB-41).
 *
 * The result is a code only. Nothing here is logged: the payload holds no personal data, and a
 * refusal is counted by the sign-up limits (BB-39), not here.
 */
import { createHmac } from 'node:crypto';
import { createChallenge, randomInt, verifySolution, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

export const BOT_CHECK_CODES = { failed: 'BOT_CHECK_FAILED' } as const;

export type BotCheckResult = { ok: true } | { ok: false; code: typeof BOT_CHECK_CODES.failed };

/**
 * Work per challenge. The counter is how many tries the browser needs on average, and the cost
 * is the work per try. Kept small so a low-end phone finishes in about a second. The per-network
 * sign-up limit does the rest.
 */
export const BOT_CHECK_DEFAULTS = {
  algorithm: 'PBKDF2/SHA-256',
  cost: 1_000,
  counterMin: 100,
  counterMax: 1_000,
  ttlSeconds: 600,
  minKeyLength: 32,
} as const;

/** Remembers solved challenges until they expire, so one solution cannot be used twice. */
export interface UsedChallenges {
  /** True the first time `id` is claimed, false after that. */
  claim(id: string, expiresAt: Date): Promise<boolean>;
}

/**
 * Per server instance. A replay that lands on another instance still meets the per-network
 * sign-up limit. Moves to the shared rate_counters table once BB-39 is on main.
 */
export function memoryUsedChallenges(maxEntries = 10_000): UsedChallenges {
  const seen = new Map<string, number>();
  return {
    async claim(id, expiresAt) {
      const now = Date.now();
      if ((seen.get(id) ?? 0) > now) return false;
      for (const [key, until] of seen) if (until <= now) seen.delete(key);
      while (seen.size >= maxEntries) seen.delete(seen.keys().next().value as string);
      seen.set(id, expiresAt.getTime());
      return true;
    },
  };
}

export interface BotCheckConfig {
  /** ALTCHA_HMAC_KEY. Signs challenges so the browser cannot make its own. */
  hmacKey: string;
  cost?: number;
  counterMin?: number;
  counterMax?: number;
  ttlSeconds?: number;
  used?: UsedChallenges;
  now?: () => Date;
}

const failed: BotCheckResult = { ok: false, code: BOT_CHECK_CODES.failed };

/** Two separate secrets from one key, so one env var is enough. */
const subKey = (key: string, label: string) =>
  createHmac('sha256', key).update(label).digest('base64url');

interface Submitted {
  challenge: Challenge;
  solution: { counter: number; derivedKey: string; time?: number };
}

/** The widget sends base64 JSON. Plain JSON is accepted too. Anything else is null. */
function parsePayload(raw: unknown): Submitted | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 8_000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString());
  } catch {
    return null;
  }
  const v = value as Partial<Submitted> | null;
  const params = v?.challenge?.parameters;
  const solution = v?.solution;
  if (!params || typeof params !== 'object' || typeof v?.challenge?.signature !== 'string') {
    return null;
  }
  if (typeof solution?.counter !== 'number' || typeof solution.derivedKey !== 'string') return null;
  return v as Submitted;
}

export function createBotCheck(config: BotCheckConfig) {
  if (!config.hmacKey || config.hmacKey.length < BOT_CHECK_DEFAULTS.minKeyLength) {
    throw new Error(
      `ALTCHA_HMAC_KEY must be at least ${BOT_CHECK_DEFAULTS.minKeyLength} characters.`,
    );
  }
  const signatureSecret = subKey(config.hmacKey, 'altcha-signature');
  const keySignatureSecret = subKey(config.hmacKey, 'altcha-key-signature');
  const cost = config.cost ?? BOT_CHECK_DEFAULTS.cost;
  const counterMin = config.counterMin ?? BOT_CHECK_DEFAULTS.counterMin;
  const counterMax = config.counterMax ?? BOT_CHECK_DEFAULTS.counterMax;
  const ttlSeconds = config.ttlSeconds ?? BOT_CHECK_DEFAULTS.ttlSeconds;
  const used = config.used ?? memoryUsedChallenges();
  const now = config.now ?? (() => new Date());

  return {
    /** A fresh challenge for the sign-up form. Safe to send to the browser. */
    challenge(): Promise<Challenge> {
      return createChallenge({
        algorithm: BOT_CHECK_DEFAULTS.algorithm,
        cost,
        counter: randomInt(counterMax, counterMin),
        deriveKey,
        expiresAt: new Date(now().getTime() + ttlSeconds * 1000),
        hmacSignatureSecret: signatureSecret,
        hmacKeySignatureSecret: keySignatureSecret,
      });
    },

    /** Checks a solved challenge from the form. Each one passes once, before it expires. */
    async verify(raw: unknown): Promise<BotCheckResult> {
      const payload = parsePayload(raw);
      if (!payload) return failed;
      try {
        const result = await verifySolution({
          challenge: payload.challenge,
          solution: payload.solution,
          deriveKey,
          hmacSignatureSecret: signatureSecret,
          hmacKeySignatureSecret: keySignatureSecret,
        });
        if (!result.verified) return failed;
      } catch {
        return failed;
      }
      const expiresAt = payload.challenge.parameters.expiresAt;
      const until = new Date(
        typeof expiresAt === 'number' ? expiresAt * 1000 : now().getTime() + ttlSeconds * 1000,
      );
      return (await used.claim(payload.challenge.signature as string, until))
        ? { ok: true }
        : failed;
    },
  };
}

export type BotCheck = ReturnType<typeof createBotCheck>;
