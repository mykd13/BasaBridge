/**
 * Speech pipeline (docs/PLAN.md section 8). Owner: James (BB-22 to BB-30).
 * The provider is chosen by the BB-22 bake-off. Everything else talks to this interface only,
 * so swapping provider never touches the learning engine or the UI.
 */
import type { TryAnalysis, WordResult } from '@basabridge/contracts';

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

/**
 * Compare the words that should have been said with the words heard (BB-25).
 * Must handle substitutions, omissions, insertions, repetitions and self-corrections,
 * and must flag low-confidence words instead of counting them as errors.
 */
export function alignWords(_expected: string[], _heard: HeardWord[]): WordResult[] {
  throw new Error('alignWords is not implemented yet (BB-25)');
}

/** Words right per minute. Zero when there is no elapsed time. */
export function wordsPerMinute(wordsRight: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((wordsRight / seconds) * 60);
}

/** Build the per-try summary from aligned words (BB-26). */
export function summariseTry(words: WordResult[], seconds: number): TryAnalysis {
  const expected = words.filter((w) => w.expected !== null);
  const right = expected.filter((w) => w.outcome === 'correct' || w.markedMisheard).length;
  let lastIndex = -1;
  expected.forEach((w, i) => {
    if (w.outcome !== 'omission') lastIndex = i;
  });
  return {
    completed: expected.length > 0 && lastIndex === expected.length - 1,
    lastWordIndex: lastIndex,
    wordsTotal: expected.length,
    wordsRight: right,
    seconds,
    wordsPerMinute: wordsPerMinute(right, seconds),
    words,
  };
}

export * from './audio-store';
export * from './audio';
