import type { SpeechError } from './errors';
import type { HeardWord, SpeechProvider, TranscribeOptions } from './index';

export interface FakeSpeechOptions {
  /** Seconds each word takes. Default 0.5. */
  secondsPerWord?: number;
  /** Confidence for words heard cleanly. Default 0.95. */
  confidence?: number;
  /** Zero-based reference word positions that are not heard. */
  drop?: number[];
  /** Reference word positions heard as a different word. */
  substitute?: Record<number, string>;
  /** Reference word positions heard with this low confidence. */
  lowConfidence?: Record<number, number>;
  /** Hear nothing, as with a silent recording. */
  empty?: boolean;
  /** Reject with this error. */
  fail?: SpeechError;
  /** Wait this many milliseconds before answering. The abort signal ends the wait early. */
  delayMs?: number;
}

/** What each call received, so tests can check the reference text was passed on. */
export interface FakeSpeechCall {
  referenceText: string;
  audioBytes: number;
}

/**
 * Deterministic provider for tests and local development (BB-24).
 * It never reads the audio. It "hears" the reference text, shaped by the options.
 */
export class FakeSpeechProvider implements SpeechProvider {
  readonly name = 'fake';
  readonly supportsBiasing = true;
  readonly calls: FakeSpeechCall[] = [];

  constructor(private readonly options: FakeSpeechOptions = {}) {}

  async transcribe(
    audio: Blob,
    { referenceText, signal }: TranscribeOptions,
  ): Promise<HeardWord[]> {
    this.calls.push({ referenceText, audioBytes: audio.size });
    const o = this.options;
    if (o.delayMs) await wait(o.delayMs, signal);
    if (signal?.aborted) throw abortError();
    if (o.fail) throw o.fail;
    if (o.empty) return [];

    const per = o.secondsPerWord ?? 0.5;
    const words: HeardWord[] = [];
    let clock = 0;
    referenceText
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token, i) => {
        const start = clock;
        clock += per;
        if (o.drop?.includes(i)) return;
        const text = (o.substitute?.[i] ?? token).toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
        if (!text) return;
        words.push({
          text,
          start,
          end: start + per,
          confidence: o.lowConfidence?.[i] ?? o.confidence ?? 0.95,
        });
      });
    return words;
  }
}

function abortError(): Error {
  const e = new Error('aborted');
  e.name = 'AbortError';
  return e;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    }
  });
}
