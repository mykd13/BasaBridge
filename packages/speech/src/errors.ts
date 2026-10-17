/**
 * Typed speech errors (BB-24). The UI looks up `messageKey` in the i18n catalog and uses `retryable` to offer another try.
 * Messages never carry audio, the reference text or learner details.
 */
export type SpeechErrorCode =
  | 'not_configured'
  | 'empty_result'
  | 'timeout'
  | 'aborted'
  | 'bad_audio'
  | 'rate_limited'
  | 'provider_unavailable';

const RETRYABLE: Record<SpeechErrorCode, boolean> = {
  not_configured: false,
  empty_result: true,
  timeout: true,
  aborted: true,
  bad_audio: true,
  rate_limited: true,
  provider_unavailable: true,
};

export class SpeechError extends Error {
  readonly code: SpeechErrorCode;
  /** i18n catalog key for the text the UI shows. The wording lives in the catalog, not here. */
  readonly messageKey: string;
  readonly retryable: boolean;

  constructor(code: SpeechErrorCode, options: { cause?: unknown } = {}) {
    // The developer message is the code only, so nothing sensitive can leak into logs.
    super(`speech error: ${code}`, { cause: options.cause });
    this.name = 'SpeechError';
    this.code = code;
    this.messageKey = `speech.error.${code}`;
    this.retryable = RETRYABLE[code];
  }
}

export function isSpeechError(value: unknown): value is SpeechError {
  return value instanceof SpeechError;
}

/** Turn anything a provider throws into a SpeechError. HTTP-like `status` fields are understood. */
export function toSpeechError(error: unknown): SpeechError {
  if (isSpeechError(error)) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new SpeechError('aborted', { cause: error });
  }
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 429) return new SpeechError('rate_limited', { cause: error });
  if (status === 400 || status === 415 || status === 422) {
    return new SpeechError('bad_audio', { cause: error });
  }
  return new SpeechError('provider_unavailable', { cause: error });
}
