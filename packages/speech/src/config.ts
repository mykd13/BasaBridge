import { SpeechError } from './errors';
import { FakeSpeechProvider } from './fake';
import type { SpeechProvider } from './index';
import { DEFAULT_TIMEOUT_MS, withSpeechGuards } from './provider';

export interface SpeechEnv {
  SPEECH_PROVIDER?: string;
  SPEECH_API_KEY?: string;
  SPEECH_TIMEOUT_MS?: string;
}

type Factory = (env: { apiKey: string | undefined }) => SpeechProvider;

/**
 * Providers by name. The real one is added here once the BB-22 bake-off picks it.
 * Its adapter reads `apiKey` and must throw SpeechError('not_configured') when it is missing.
 */
const REGISTRY: Record<string, Factory> = {
  fake: () => new FakeSpeechProvider(),
};

/** The process environment, read without needing Node types in this package. */
function runtimeEnv(): SpeechEnv {
  return (globalThis as { process?: { env?: SpeechEnv } }).process?.env ?? {};
}

export function timeoutFromEnv(value: string | undefined): number {
  const n = Number(value);
  return value && Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

/** Build the configured provider, wrapped with the shared guards. Throws SpeechError('not_configured'). */
export function createSpeechProvider(env: SpeechEnv = runtimeEnv()): SpeechProvider {
  const name = env.SPEECH_PROVIDER?.trim().toLowerCase();
  const factory = name ? REGISTRY[name] : undefined;
  if (!factory) throw new SpeechError('not_configured');
  const provider = factory({ apiKey: env.SPEECH_API_KEY?.trim() || undefined });
  return withSpeechGuards(provider, { timeoutMs: timeoutFromEnv(env.SPEECH_TIMEOUT_MS) });
}
