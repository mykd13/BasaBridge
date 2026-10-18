/**
 * Rate limits (BB-39). Fixed windows counted in a shared store (the rate_counters table), so
 * every server instance sees the same count. Subjects such as a learner id, an IP address or a
 * typed username are stored only as a keyed hash.
 *
 * Limits are configuration: each policy can be overridden with RATE_LIMIT_<NAME>=<limit>/<seconds>,
 * for example RATE_LIMIT_STORY_PER_LEARNER=20/3600.
 */
import { createHmac } from 'node:crypto';
import type { Env } from './env';

export interface LimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const DEFAULT_POLICIES = {
  /** Story generation started by one learner. */
  story_per_learner: { limit: 20, windowSeconds: 3600 },
  /** Story generation across the whole app. */
  story_global: { limit: 300, windowSeconds: 3600 },
  /** Speech analysis requests by one learner. */
  speech_per_learner: { limit: 60, windowSeconds: 3600 },
  speech_global: { limit: 3000, windowSeconds: 3600 },
  /** Text-to-speech requests by one learner (BB-57). */
  tts_per_learner: { limit: 200, windowSeconds: 3600 },
  /** Sign-in attempts from one network address. */
  sign_in_per_ip: { limit: 30, windowSeconds: 900 },
  /** Sign-in attempts for one typed username or email. */
  sign_in_per_account: { limit: 10, windowSeconds: 900 },
  /** Browser error reports from one network address. */
  client_errors_per_ip: { limit: 30, windowSeconds: 300 },
} satisfies Record<string, LimitPolicy>;

export type PolicyName = keyof typeof DEFAULT_POLICIES;
export type Policies = Record<PolicyName, LimitPolicy>;

/** Reads overrides from the environment. Bad values are ignored and the default is kept. */
export function policiesFromEnv(env: Env): Policies {
  const out = { ...DEFAULT_POLICIES } as Policies;
  for (const name of Object.keys(DEFAULT_POLICIES) as PolicyName[]) {
    const raw = env[`RATE_LIMIT_${name.toUpperCase()}`]?.trim();
    const m = raw?.match(/^(\d+)\/(\d+)$/);
    if (!m) continue;
    const limit = Number(m[1]);
    const windowSeconds = Number(m[2]);
    if (limit > 0 && windowSeconds > 0) out[name] = { limit, windowSeconds };
  }
  return out;
}

/** The shared store. `increment` must be atomic and return the count after adding one. */
export interface CounterStore {
  increment(key: string, windowStart: Date, expiresAt: Date): Promise<number>;
}

export interface LimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  /** Seconds until the current window ends. */
  retryAfterSeconds: number;
}

/** Keyed hash of a subject, so the counter table never holds a raw username or address. */
export function hashSubject(subject: string, secret: string): string {
  return createHmac('sha256', secret).update(subject).digest('base64url').slice(0, 32);
}

export function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/**
 * Counts one use of `policy` by `subject` and says whether it is allowed. Use the subject
 * `global` for app-wide policies. Store errors are thrown, so the caller chooses to fail open
 * or closed.
 */
export async function checkLimit(
  store: CounterStore,
  name: PolicyName,
  policy: LimitPolicy,
  subject: string,
  options: { secret: string; now?: Date },
): Promise<LimitResult> {
  const now = options.now ?? new Date();
  const start = windowStart(now, policy.windowSeconds);
  const end = new Date(start.getTime() + policy.windowSeconds * 1000);
  const key = `${name}:${subject === 'global' ? 'global' : hashSubject(subject, options.secret)}`;
  const count = await store.increment(key, start, end);
  return {
    allowed: count <= policy.limit,
    count,
    limit: policy.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 1000)),
  };
}
