import { SpeechError, toSpeechError } from './errors';
import type { HeardWord, SpeechProvider, TranscribeOptions } from './index';

export const DEFAULT_TIMEOUT_MS = 20_000;

function validate(words: HeardWord[]): HeardWord[] {
  if (!Array.isArray(words) || words.length === 0) throw new SpeechError('empty_result');
  for (const w of words) {
    const ok =
      typeof w.text === 'string' &&
      w.text.length > 0 &&
      Number.isFinite(w.start) &&
      Number.isFinite(w.end) &&
      w.start >= 0 &&
      w.end >= w.start &&
      Number.isFinite(w.confidence) &&
      w.confidence >= 0 &&
      w.confidence <= 1;
    if (!ok) throw new SpeechError('provider_unavailable');
  }
  return words;
}

/**
 * Wrap any provider so callers always get valid words or a SpeechError (BB-24):
 * timeout, abort, empty and malformed results are all mapped here, once.
 */
export function withSpeechGuards(
  provider: SpeechProvider,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): SpeechProvider {
  return {
    name: provider.name,
    supportsBiasing: provider.supportsBiasing,
    async transcribe(audio: Blob, options: TranscribeOptions): Promise<HeardWord[]> {
      if (options.signal?.aborted) throw new SpeechError('aborted');
      const controller = new AbortController();
      const forward = () => controller.abort();
      options.signal?.addEventListener('abort', forward, { once: true });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      try {
        const words = await provider.transcribe(audio, { ...options, signal: controller.signal });
        if (timedOut) throw new SpeechError('timeout');
        return validate(words);
      } catch (error) {
        if (timedOut) throw new SpeechError('timeout', { cause: error });
        throw toSpeechError(error);
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', forward);
      }
    },
  };
}
