/**
 * Speech pipeline (docs/PLAN.md section 8). Owner: James (BB-22 to BB-30).
 * The provider is chosen by the BB-22 bake-off. Everything else talks to this interface only,
 * so swapping provider never touches the learning engine or the UI.
 */

/** One word as heard by the speech provider. Times are seconds from the start of the recording. */
export interface HeardWord {
  text: string;
  start: number;
  end: number;
  /** 0..1 */
  confidence: number;
}

export interface TranscribeOptions {
  /** The passage the learner is reading. Providers that support it use this to bias recognition. */
  referenceText: string;
  signal?: AbortSignal;
}

/** A speech provider adapter (BB-24). */
export interface SpeechProvider {
  readonly name: string;
  /** Transcribe a finished recording. A streaming variant is added once the provider is chosen. */
  transcribe(audio: Blob, options: TranscribeOptions): Promise<HeardWord[]>;
}

export { alignWords, alignWordsTimed, isLowConfidence, LOW_CONFIDENCE_THRESHOLD } from './align';
export type { HeardSpan, TimedAlignment } from './align';
export { readingSeconds, stoppingPoint, toTryRecord } from './completion';
export type { StoppingPoint, TryRecord } from './completion';

export { wordsPerMinute, summariseTry } from './summary';
