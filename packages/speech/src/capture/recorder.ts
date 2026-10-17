import {
  releaseStream,
  requestMicrophone,
  type MicFailure,
  type PermissionDeps,
} from './permissions';

/** Preferred first. Chrome and Edge record webm/opus, Safari records mp4. */
export const RECORDING_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
] as const;

export function pickMimeType(
  isSupported: (type: string) => boolean = (t) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t),
): string | null {
  return RECORDING_TYPES.find((t) => isSupported(t)) ?? null;
}

export interface LevelReader {
  read(): number;
  close(): void;
}

export interface RecorderDeps extends PermissionDeps {
  isTypeSupported?: (type: string) => boolean;
  createRecorder?: (stream: MediaStream, mimeType: string) => MediaRecorder;
  createLevelReader?: (stream: MediaStream) => LevelReader;
}

/** Why recording ended. 'device-lost' means the microphone went away mid try. */
export type StopReason = 'stopped' | 'device-lost';

export interface RecorderEvents {
  /** One slice of audio, in order. Only fires after the learner started a try. */
  onChunk: (chunk: Blob, index: number) => void;
  /** Level 0..1, about 20 times a second while recording, and 0 when it ends. */
  onLevel?: (level: number) => void;
  /** Called after the last chunk when recording ends. */
  onStop?: (totalChunks: number, reason: StopReason) => void;
}

export type StartResult = { ok: true; mimeType: string } | { ok: false; state: MicFailure };

const SLICE_MS = 1000;
const LEVEL_MS = 50;

function browserLevelReader(stream: MediaStream): LevelReader {
  const Ctx: typeof AudioContext | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return { read: () => 0, close: () => {} };
  const ctx = new Ctx();
  // Safari starts the context suspended, which leaves the meter flat.
  void ctx.resume?.().catch(() => {});
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  return {
    read() {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      // Speech sits well below full scale, so scale up and clamp.
      return Math.min(1, Math.sqrt(sum / buf.length) * 4);
    },
    close() {
      void ctx.close().catch(() => {});
    },
  };
}

/**
 * Records one try at a time. start() asks for the microphone, so call it from a click.
 * Every path that ends recording releases the microphone, including a discard while the
 * permission prompt is still open and any failure while setting up.
 */
export class MicRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private levels: LevelReader | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private count = 0;
  private deviceLost = false;
  /** Bumped by discard() so a start() that is still waiting on the prompt can tell it was cancelled. */
  private generation = 0;
  private starting: Promise<StartResult> | null = null;

  constructor(
    private readonly events: RecorderEvents,
    private readonly deps: RecorderDeps = {},
  ) {}

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** A second call while the first is pending returns the same promise, so one click opens one stream. */
  start(): Promise<StartResult> {
    if (this.recorder) return Promise.resolve({ ok: true, mimeType: this.recorder.mimeType });
    if (this.starting) return this.starting;
    const promise: Promise<StartResult> = this.begin(this.generation).finally(() => {
      // A discard may already have replaced this with a newer start. Only clear our own.
      if (this.starting === promise) this.starting = null;
    });
    this.starting = promise;
    return promise;
  }

  private async begin(generation: number): Promise<StartResult> {
    const mimeType = pickMimeType(this.deps.isTypeSupported);
    if (!mimeType) return { ok: false, state: 'unsupported' };

    // With nothing injected, let requestMicrophone use the browser's own mediaDevices.
    const result = await requestMicrophone(this.deps.mediaDevices ? this.deps : undefined);
    if (result.state !== 'granted') return { ok: false, state: result.state };

    const stream = result.stream;
    if (generation !== this.generation) {
      // discard() ran while the prompt was open. Do not record for a screen nobody is watching.
      releaseStream(stream);
      return { ok: false, state: 'unavailable' };
    }

    this.stream = stream;
    this.count = 0;
    this.deviceLost = false;
    try {
      const recorder = this.deps.createRecorder
        ? this.deps.createRecorder(stream, mimeType)
        : new MediaRecorder(stream, { mimeType });
      this.recorder = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) this.events.onChunk(event.data, this.count++);
      };
      recorder.onstop = () => {
        const total = this.count;
        const reason: StopReason = this.deviceLost ? 'device-lost' : 'stopped';
        this.teardown();
        this.events.onStop?.(total, reason);
      };
      recorder.onerror = () => this.loseDevice();
      // An unplugged device ends the track without the learner pressing stop.
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => this.loseDevice();
      });

      this.levels = (this.deps.createLevelReader ?? browserLevelReader)(stream);
      if (this.events.onLevel) {
        this.levelTimer = setInterval(
          () => this.events.onLevel?.(this.levels?.read() ?? 0),
          LEVEL_MS,
        );
      }
      recorder.start(SLICE_MS);
      return { ok: true, mimeType: recorder.mimeType || mimeType };
    } catch {
      this.teardown();
      return { ok: false, state: 'unavailable' };
    }
  }

  private loseDevice() {
    this.deviceLost = true;
    this.stop();
  }

  /** Ends the recording. The final chunk arrives before onStop. */
  stop(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop(); // onstop does the teardown
    } else {
      this.teardown();
    }
  }

  /** Throw the current take away and start a new one. The caller opens a fresh upload for it. */
  restart(): Promise<StartResult> {
    this.discard();
    return this.start();
  }

  /** Stop without delivering further chunks or onStop. Also cancels a start() that is waiting on the prompt. */
  discard(): void {
    this.generation += 1;
    this.starting = null;
    if (this.recorder) {
      this.recorder.ondataavailable = null;
      this.recorder.onstop = null;
      this.recorder.onerror = null;
      if (this.recorder.state !== 'inactive') this.recorder.stop();
    }
    this.teardown();
  }

  private teardown(): void {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    this.levels?.close();
    this.levels = null;
    releaseStream(this.stream);
    this.stream = null;
    this.recorder = null;
    this.events.onLevel?.(0);
  }
}
