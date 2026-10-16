/** Shapes used only by the bake-off harness. Nothing here ships in the app. */
import type { HeardWord, SpeechProvider, TranscribeOptions } from '../src/index.ts';
import type { Wav } from './wav.ts';

export type { HeardWord };

export interface Passage {
  id: string;
  /** A representative level. The tier comes from packages/levels. */
  level: number;
  text: string;
}

/** The only reader fields we collect (PROTOCOL.md). */
export interface Recording {
  recordingId: string;
  readerCode: string;
  passageId: string;
  ageBand: string;
  firstLanguage: string;
  device: string;
  noise: string;
  /** Provider names the guardian agreed to send this recording to. */
  vendors: string[];
}

export const GROUP_FIELDS = ['ageBand', 'firstLanguage', 'device', 'noise', 'tier'] as const;
export type GroupField = (typeof GROUP_FIELDS)[number];

export const TRUTH_OUTCOMES = [
  'correct',
  'substitution',
  'omission',
  'insertion',
  'repetition',
  'self_correction',
  'unclear',
] as const;
export type TruthOutcome = (typeof TRUTH_OUTCOMES)[number];

/** One row of a human transcript (ANNOTATION.md). */
export interface TruthRow {
  index: number | null;
  expected: string | null;
  outcome: TruthOutcome;
  said: string[];
  start: number | null;
  end: number | null;
}

/** The human verdict on one passage word, from a reading point of view. */
export type ReadingVerdict = 'read' | 'miscue' | 'unclear';

export function verdictOf(outcome: TruthOutcome): ReadingVerdict {
  if (outcome === 'unclear') return 'unclear';
  if (outcome === 'substitution' || outcome === 'omission') return 'miscue';
  return 'read';
}

export type Mode = 'plain' | 'biased';

export interface BakeoffOptions extends TranscribeOptions {
  /** Send the reference text to the provider's biasing feature. Defaults to true. */
  bias?: boolean;
  /** Sample rate of the WAV in Hz. */
  sampleRate?: number;
  /** Only for the offline oracle provider used to test the harness. Vendors never see it. */
  selfTestWords?: string[];
}

/** A provider's own miscue verdict per passage word, when it does reading assessment. */
export type AssessedWord = 'ok' | 'miscue';

export interface ProviderResult {
  words: HeardWord[];
  /** One entry per passage word, for providers with reading or pronunciation assessment. */
  assessment?: AssessedWord[];
  /** Streaming only: ms from the first audio chunk to the first word. */
  firstWordMs?: number;
  /** Streaming only: ms from the last audio chunk to the final result. */
  finalAfterEndMs?: number;
}

/** A throwaway adapter. It implements SpeechProvider so the production shape is exercised. */
export interface BakeoffProvider extends SpeechProvider {
  /** How the provider biases toward expected text, for the report. */
  readonly biasing: string;
  /** Whether the provider streams with word timings. */
  readonly streaming: boolean;
  /** Batch call returning words plus any assessment. */
  run(audio: Blob, options: BakeoffOptions): Promise<ProviderResult>;
  /** Streaming call that feeds the PCM at real-time pace. */
  runStream?(wav: Wav, options: BakeoffOptions): Promise<ProviderResult>;
}

/** Saved per recording in BAKEOFF_DATA_DIR/results. Never copied into the repo. */
export interface StoredResult extends ProviderResult {
  provider: string;
  mode: Mode;
  transport: 'batch' | 'stream';
  recordingId: string;
  latencyMs: number;
  audioSeconds: number;
  ok: boolean;
  /** HTTP status or a short error code. Never a response body. */
  error?: string;
}
