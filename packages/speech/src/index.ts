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

export * from './errors';
export * from './config';
export * from './fake';
export { withSpeechGuards, DEFAULT_TIMEOUT_MS } from './provider';
export * from './placement';

/** A speech provider adapter (BB-24). */
export interface SpeechProvider {
  readonly name: string;
  /** True when the provider uses `referenceText` to bias recognition toward the passage. */
  readonly supportsBiasing?: boolean;
  /** Transcribe a finished recording. A streaming variant is added once the provider is chosen. */
  transcribe(audio: Blob, options: TranscribeOptions): Promise<HeardWord[]>;
}

export { assessRoom, ROOM_THRESHOLDS } from './environment';
export type { RoomCheck, RoomInput, RoomStatus, RoomTip } from './environment';
export { CONDITION_THRESHOLDS, detectConditions } from './conditions';
export type { AudioFrame, ConditionResult } from './conditions';
export { AUTHENTICITY_THRESHOLDS, assessAuthenticity, timingSignature } from './authenticity';
export type { ReviewReason } from './authenticity';
export { checkTry, confirmReview, LEARNER_MESSAGE_KEYS } from './checks';
export type { TryCheckInput, TryCheckResult } from './checks';
export { alignWords, alignWordsTimed, isLowConfidence, LOW_CONFIDENCE_THRESHOLD } from './align';
export type { HeardSpan, TimedAlignment } from './align';
export { readingSeconds, stoppingPoint, toTryRecord } from './completion';
export type { StoppingPoint, TryRecord } from './completion';
export { aggregateReadingPatterns, patternConfidence, type TryEvidence } from './patterns';

export { wordsPerMinute, summariseTry } from './summary';
