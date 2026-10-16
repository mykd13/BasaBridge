'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChunkUploader,
  MicRecorder,
  type MicFailure,
  type UploadStatus,
} from '@basabridge/speech/capture';

export type MicPhase = 'ready' | 'recording' | 'finished' | MicFailure;

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

  const open = useCallback(async (restart: boolean) => {
    uploader.current?.cancel();
    const up = new ChunkUploader({
      endpoint: ENDPOINT,
      tryId: crypto.randomUUID(),
      onStatus: setUpload,
    });
    uploader.current = up;
    recorder.current ??= new MicRecorder({
      onChunk: (chunk, index) => uploader.current?.push(chunk, index),
      onLevel: setLevel,
      onStop: (total) => {
        setPhase('finished');
        uploader.current?.finish(total).catch(() => {});
      },
    });
    const result = restart ? await recorder.current.restart() : await recorder.current.start();
    setPhase(result.ok ? 'recording' : result.state);
  }, []);

  const start = useCallback(() => open(false), [open]);
  const restart = useCallback(() => open(true), [open]);
  const stop = useCallback(() => recorder.current?.stop(), []);
  /** The learner says they have no microphone: show the help screen without asking the browser. */
  const noMicrophone = useCallback(() => setPhase('no-device'), []);

  // Leaving the page must turn the microphone off.
  useEffect(
    () => () => {
      recorder.current?.discard();
      uploader.current?.cancel();
    },
    [],
  );

  return { phase, level, upload, start, stop, restart, noMicrophone };
}
