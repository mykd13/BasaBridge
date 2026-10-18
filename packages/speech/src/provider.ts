import { SpeechError, toSpeechError } from './errors';
import type { HeardWord, SpeechProvider, TranscribeOptions } from './index';

export const DEFAULT_TIMEOUT_MS = 20_000;

function validate(words: HeardWord[]): HeardWord[] {
  if (!Array.isArray(words) || words.length === 0) throw new SpeechError('empty_result');
  for (const w of words) {
    const ok =
      typeof w === 'object' &&
      w !== null &&
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
 * The timeout and abort are enforced by a race, so they hold even when the adapter
 * ignores the signal or hangs.
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
      let cleanup = () => {};
      try {
        const words = await new Promise<HeardWord[]>((resolve, reject) => {
          const timer = setTimeout(() => {
            controller.abort();
            reject(new SpeechError('timeout'));
          }, timeoutMs);
          const onAbort = () => {
            controller.abort();
            reject(new SpeechError('aborted'));
          };
          options.signal?.addEventListener('abort', onAbort, { once: true });
          cleanup = () => {
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', onAbort);
          };
          // Only the known fields are passed on, so a stray runtime field never reaches an adapter.
          provider
            .transcribe(audio, {
              referenceText: options.referenceText,
              signal: controller.signal,
            })
            .then(resolve, reject);
        });
        return validate(words);
      } catch (error) {
        throw toSpeechError(error);
      } finally {
        cleanup();
      }
    },
  };
}
