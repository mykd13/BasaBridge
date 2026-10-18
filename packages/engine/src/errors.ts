import type { EngineErrorCode } from '@basabridge/contracts/engine';

/** A rule of the engine said no. The code is safe to send to the browser; the message is not shown. */
export class EngineError extends Error {
  readonly code: EngineErrorCode;
  constructor(code: EngineErrorCode) {
    super(code);
    this.name = 'EngineError';
    this.code = code;
  }
}

/** HTTP status for each error code, used by the route handlers. */
export function statusFor(code: EngineErrorCode): number {
  switch (code) {
    case 'unauthorized':
      return 401;
    case 'bad_request':
      return 400;
    case 'placement_required':
    case 'mic_not_allowed':
    case 'voice_required':
    case 'accommodation_not_allowed':
      return 403;
    case 'placement_not_found':
    case 'session_not_found':
    case 'question_not_found':
    case 'analysis_not_found':
      return 404;
    case 'no_story_available':
    case 'not_configured':
      return 503;
    case 'bad_choice':
      return 400;
    default:
      return 409;
  }
}
