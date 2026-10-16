/**
 * Microphone permission and device states (BB-23, canvas B2 and D3).
 * Call requestMicrophone from a click or tap handler, never on page load.
 */
export type MicState =
  /** Permission granted and a stream is open. */
  | 'granted'
  /** The learner dismissed or declined the prompt this time. The browser may ask again. */
  | 'denied'
  /** The browser or a site setting blocks the microphone. Only the browser settings can undo it. */
  | 'blocked'
  /** No microphone was found. */
  | 'no-device'
  /** A microphone exists but another app holds it or it failed to start. */
  | 'unavailable'
  /** This browser cannot record audio (or the page is not on a secure origin). */
  | 'unsupported';

export type MicFailure = Exclude<MicState, 'granted'>;

export type MicResult = { state: 'granted'; stream: MediaStream } | { state: MicFailure; stream?: undefined };

export interface PermissionDeps {
  mediaDevices?: Pick<MediaDevices, 'getUserMedia'> | undefined;
  permissions?: Pick<Permissions, 'query'> | undefined;
}

function browserDeps(): PermissionDeps {
  if (typeof navigator === 'undefined') return {};
  return { mediaDevices: navigator.mediaDevices, permissions: navigator.permissions };
}

export const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

async function permissionIsDenied(permissions: PermissionDeps['permissions']): Promise<boolean> {
  if (!permissions) return false;
  try {
    // Safari rejects the name 'microphone'. Treat that as "unknown".
    const status = await permissions.query({ name: 'microphone' as PermissionName });
    return status.state === 'denied';
  } catch {
    return false;
  }
}

/** Ask for the microphone and report what happened as a state the UI can show. */
export async function requestMicrophone(deps: PermissionDeps = browserDeps()): Promise<MicResult> {
  const { mediaDevices, permissions } = deps;
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    return { state: 'unsupported' };
  }
  try {
    const stream = await mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
    return { state: 'granted', stream };
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return { state: (await permissionIsDenied(permissions)) ? 'blocked' : 'denied' };
      case 'SecurityError':
        return { state: 'blocked' };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
      case 'OverconstrainedError':
        return { state: 'no-device' };
      default:
        return { state: 'unavailable' };
    }
  }
}

/** Stop every track so the browser's recording indicator goes off. Safe to call twice. */
export function releaseStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
