/**
 * Short in-memory microphone capture for word practice.
 * Stand-in until the shared capture module from `@basabridge/speech` is on main: swap this file for it then.
 * Every exit path stops the microphone tracks, and a cancelled capture never calls back.
 */
export interface Capture {
  /** Stop recording and hand the audio to the callback. */
  stop: () => void;
  /** Stop recording and drop the audio without calling back. Safe to call more than once. */
  cancel: () => void;
}

export async function startCapture(onAudio: (audio: Blob) => void): Promise<Capture | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !globalThis.MediaRecorder) {
    return null;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }
  const stopTracks = () => stream.getTracks().forEach((track) => track.stop());

  let rec: MediaRecorder;
  try {
    rec = new MediaRecorder(stream);
  } catch {
    stopTracks();
    return null;
  }

  const chunks: Blob[] = [];
  let cancelled = false;
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.onstop = () => {
    stopTracks();
    const audio = new Blob(chunks, { type: rec.mimeType });
    chunks.length = 0;
    if (!cancelled) onAudio(audio);
  };
  try {
    rec.start();
  } catch {
    stopTracks();
    return null;
  }

  const finish = () => {
    if (rec.state === 'recording') rec.stop();
    else stopTracks();
  };
  return {
    stop: finish,
    cancel: () => {
      cancelled = true;
      chunks.length = 0;
      finish();
    },
  };
}
