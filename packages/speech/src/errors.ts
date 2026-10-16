/**
 * Typed speech errors (BB-24). The UI shows `userMessage` and uses `retryable` to offer another try.
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

const DETAILS: Record<SpeechErrorCode, { userMessage: string; retryable: boolean }> = {
  not_configured: {
    userMessage: 'Reading help is not set up yet. Please tell a grown-up.',
    retryable: false,
  },
  empty_result: {
    userMessage: 'I could not hear any words. Check your microphone and try again.',
    retryable: true,
  },
  timeout: {
    userMessage: 'That took too long. Please try again.',
    retryable: true,
  },
  aborted: {
    userMessage: 'The recording was stopped.',
    retryable: true,
  },
  bad_audio: {
    userMessage: 'I could not use that recording. Please read again.',
    retryable: true,
  },
  rate_limited: {
    userMessage: 'Lots of readers are busy right now. Please wait a moment and try again.',
    retryable: true,
  },
  provider_unavailable: {
    userMessage: 'I could not listen just now. Please try again soon.',
    retryable: true,
  },
};

export class SpeechError extends Error {
  readonly code: SpeechErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(code: SpeechErrorCode, options: { cause?: unknown } = {}) {
    // The developer message is the code only, so nothing sensitive can leak into logs.
    super(`speech error: ${code}`, { cause: options.cause });
    this.name = 'SpeechError';
    this.code = code;
    this.userMessage = DETAILS[code].userMessage;
    this.retryable = DETAILS[code].retryable;
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
