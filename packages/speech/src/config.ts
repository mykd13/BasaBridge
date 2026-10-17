import { SpeechError } from './errors';
import { FakeSpeechProvider } from './fake';
import type { SpeechProvider } from './index';
import { DEFAULT_TIMEOUT_MS, withSpeechGuards } from './provider';

export interface SpeechEnv {
  SPEECH_PROVIDER?: string;
  SPEECH_API_KEY?: string;
  SPEECH_TIMEOUT_MS?: string;
  NODE_ENV?: string;
}

type Factory = (env: { apiKey: string | undefined }) => SpeechProvider;

/**
 * Providers by name. The real one is added here once the BB-22 bake-off picks it.
 * Its adapter reads `apiKey` and must throw SpeechError('not_configured') when it is missing.
 * A Map, so names like `constructor` never resolve to inherited properties.
 */
const REGISTRY = new Map<string, Factory>([['fake', () => new FakeSpeechProvider()]]);

/** Providers that invent results. They are refused in production, so learners never get fabricated evidence. */
const NON_PRODUCTION_ONLY = new Set(['fake']);

export const MIN_TIMEOUT_MS = 1_000;
export const MAX_TIMEOUT_MS = 120_000;

/** The process environment, read without needing Node types in this package. */
function runtimeEnv(): SpeechEnv {
  return (globalThis as { process?: { env?: SpeechEnv } }).process?.env ?? {};
}

/** Milliseconds from the environment. Anything missing, invalid or outside the safe range gives the default. */
export function timeoutFromEnv(value: string | undefined): number {
  const n = Number(value);
  if (!value || !Number.isFinite(n) || n < MIN_TIMEOUT_MS || n > MAX_TIMEOUT_MS) {
    return DEFAULT_TIMEOUT_MS;
  }
  return n;
}

/** Build the configured provider, wrapped with the shared guards. Throws SpeechError('not_configured'). */
export function createSpeechProvider(env: SpeechEnv = runtimeEnv()): SpeechProvider {
  const name = env.SPEECH_PROVIDER?.trim().toLowerCase();
  const factory = name ? REGISTRY.get(name) : undefined;
  if (!name || !factory) throw new SpeechError('not_configured');
  if (env.NODE_ENV === 'production' && NON_PRODUCTION_ONLY.has(name)) {
    throw new SpeechError('not_configured');
  }
  const provider = factory({ apiKey: env.SPEECH_API_KEY?.trim() || undefined });
  return withSpeechGuards(provider, { timeoutMs: timeoutFromEnv(env.SPEECH_TIMEOUT_MS) });
}
