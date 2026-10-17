'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChunkUploader,
  MicRecorder,
  newTryId,
  type MicFailure,
  type UploadStatus,
} from '@basabridge/speech/capture';

/** `lost` means the microphone went away in the middle of a try. */
export type MicPhase = 'ready' | 'requesting' | 'recording' | 'finished' | 'lost' | MicFailure;

const ENDPOINT = '/api/speech/chunks';

/**
 * Drives microphone capture for the reading screen (BB-23).
 * Nothing is requested or uploaded until start() runs from a click.
 * The try id here is a placeholder made in the browser. The server will issue it with BB-24.
 */
export function useMicrophone() {
  const [phase, setPhase] = useState<MicPhase>('ready');
  const [level, setLevel] = useState(0);
  const [upload, setUpload] = useState<UploadStatus>('idle');
  const recorder = useRef<MicRecorder | null>(null);
  const uploader = useRef<ChunkUploader | null>(null);
  const mounted = useRef(true);
  /** True once the learner (or a failure) ended the try, so the upload must be allowed to finish. */
  const sending = useRef(false);

  const open = useCallback(async (restart: boolean) => {
    uploader.current?.cancel();
    sending.current = false;
    setUpload('idle');
    setPhase('requesting');

    const up: ChunkUploader = new ChunkUploader({
      endpoint: ENDPOINT,
      tryId: newTryId(),
      onStatus: (status) => {
        if (!mounted.current || uploader.current !== up) return;
        setUpload(status);
        // Giving up on the upload ends the take too, so the microphone does not keep listening.
        if (status === 'failed') recorder.current?.stop();
      },
    });
    uploader.current = up;

    recorder.current ??= new MicRecorder({
      onChunk: (chunk, index) => uploader.current?.push(chunk, index),
      onLevel: (value) => {
        if (mounted.current) setLevel(value);
      },
      onStop: (total, reason) => {
        if (!mounted.current) return;
        if (reason === 'device-lost') {
          uploader.current?.cancel();
          setPhase('lost');
          return;
        }
        sending.current = true;
        setPhase('finished');
        uploader.current?.finish(total).catch(() => {});
      },
    });

    let next: MicPhase;
    try {
      const result = await (restart ? recorder.current.restart() : recorder.current.start());
      next = result.ok ? 'recording' : result.state;
    } catch {
      next = 'unavailable';
    }
    if (!mounted.current) return;
    if (next !== 'recording') up.cancel();
    setPhase(next);
  }, []);

  const start = useCallback(() => open(false), [open]);
  const restart = useCallback(() => open(true), [open]);
  const stop = useCallback(() => recorder.current?.stop(), []);
  /** The learner says they have no microphone: show the help screen without asking the browser. */
  const noMicrophone = useCallback(() => setPhase('no-device'), []);

  // Leaving the page must turn the microphone off. A try that was already finished keeps sending.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recorder.current?.discard();
      if (!sending.current) uploader.current?.cancel();
    };
  }, []);

  return { phase, level, upload, start, stop, restart, noMicrophone };
}
