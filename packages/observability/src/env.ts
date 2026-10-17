export type Env = Record<string, string | undefined>;

/** A positive number from the environment, or the fallback when it is missing or invalid. */
export function positiveNumber(env: Env, key: string, fallback: number): number {
  const raw = env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
