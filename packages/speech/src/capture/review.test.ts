import { describe, expect, it, vi } from 'vitest';
import { MicRecorder } from './recorder';
import { ChunkUploader, newTryId, TRY_HEADER } from './uploader';

function makeStream() {
  const track = { stop: vi.fn(), onended: null as null | (() => void) };
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  return { track, stream };
}

function makeRecorderFake() {
  return {
    state: 'inactive' as RecordingState,
    mimeType: 'audio/webm;codecs=opus',
    ondataavailable: null as null | ((e: BlobEvent) => void),
    onstop: null as null | (() => void),
    onerror: null as null | (() => void),
    start() {
      this.state = 'recording';
    },
    stop() {
      this.ondataavailable?.({ data: new Blob(['last']) } as BlobEvent);
      this.state = 'inactive';
      this.onstop?.();
    },
  };
}

const level = () => ({ read: () => 0, close: () => {} });

/** getUserMedia that only resolves when the test says so, like an open permission prompt. */
function pendingPrompt() {
  const streams: ReturnType<typeof makeStream>[] = [];
  const resolvers: (() => void)[] = [];
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        const s = makeStream();
        streams.push(s);
        resolvers.push(() => resolve(s.stream));
      }),
  );
  return { getUserMedia, streams, allow: () => resolvers.forEach((r) => r()) };
}

const rig = (getUserMedia: () => Promise<MediaStream>, createRecorder?: () => MediaRecorder) =>
  new MicRecorder(
    { onChunk: () => {} },
    {
      mediaDevices: { getUserMedia },
      isTypeSupported: () => true,
      createRecorder: createRecorder ?? (() => makeRecorderFake() as unknown as MediaRecorder),
      createLevelReader: level,
    },
  );

describe('MicRecorder leaks (review B1 to B3)', () => {
  it('B1: a double click opens one stream', async () => {
    const prompt = pendingPrompt();
    const recorder = rig(prompt.getUserMedia);
    const a = recorder.start();
    const b = recorder.start();
    prompt.allow();
    await Promise.all([a, b]);
    expect(prompt.getUserMedia).toHaveBeenCalledOnce();
    recorder.stop();
    expect(prompt.streams[0]!.track.stop).toHaveBeenCalled();
  });

  it('B2: discard while the prompt is open releases the stream once it is allowed', async () => {
    const prompt = pendingPrompt();
    const recorder = rig(prompt.getUserMedia);
    const started = recorder.start();
    recorder.discard(); // the page was left
    prompt.allow(); // the learner clicks Allow later
    const result = await started;
    expect(result.ok).toBe(false);
    expect(recorder.recording).toBe(false);
    expect(prompt.streams[0]!.track.stop).toHaveBeenCalled();
  });

  it('B2: restart while a prompt is open does not let the old start clear the new one', async () => {
    const prompt = pendingPrompt();
    const recorder = rig(prompt.getUserMedia);
    void recorder.start();
    const second = recorder.restart();
    prompt.allow();
    expect((await second).ok).toBe(true);
    expect(prompt.streams.filter((s) => s.track.stop.mock.calls.length === 0)).toHaveLength(1);
    recorder.stop();
  });

  it('B3: a recorder that throws on construction releases the stream and reports unavailable', async () => {
    const s = makeStream();
    const recorder = rig(
      async () => s.stream,
      () => {
        throw new DOMException('no', 'NotSupportedError');
      },
    );
    expect(await recorder.start()).toEqual({ ok: false, state: 'unavailable' });
    expect(s.track.stop).toHaveBeenCalled();
  });

  it('B3: a recorder that throws on start releases the stream', async () => {
    const s = makeStream();
    const fake = makeRecorderFake();
    fake.start = () => {
      throw new Error('boom');
    };
    const recorder = rig(
      async () => s.stream,
      () => fake as unknown as MediaRecorder,
    );
    expect(await recorder.start()).toEqual({ ok: false, state: 'unavailable' });
    expect(s.track.stop).toHaveBeenCalled();
  });

  it('S9: an unplugged microphone is reported as device-lost, not as a normal stop', async () => {
    const s = makeStream();
    const reasons: string[] = [];
    const recorder = new MicRecorder(
      { onChunk: () => {}, onStop: (_n, reason) => reasons.push(reason) },
      {
        mediaDevices: { getUserMedia: async () => s.stream },
        isTypeSupported: () => true,
        createRecorder: () => makeRecorderFake() as unknown as MediaRecorder,
        createLevelReader: level,
      },
    );
    await recorder.start();
    s.track.onended?.();
    expect(reasons).toEqual(['device-lost']);
  });

  it('S9: pressing stop is reported as stopped', async () => {
    const s = makeStream();
    const reasons: string[] = [];
    const recorder = new MicRecorder(
      { onChunk: () => {}, onStop: (_n, reason) => reasons.push(reason) },
      {
        mediaDevices: { getUserMedia: async () => s.stream },
        isTypeSupported: () => true,
        createRecorder: () => makeRecorderFake() as unknown as MediaRecorder,
        createLevelReader: level,
      },
    );
    await recorder.start();
    recorder.stop();
    expect(reasons).toEqual(['stopped']);
  });
});

const chunk = () => new Blob(['x'], { type: 'audio/webm' });
const noWait = { sleep: async () => {}, backoff: () => 0 };
const ok = (next: number) => new Response(JSON.stringify({ next }), { status: 200 });
const indexOf = (url: RequestInfo | URL) =>
  Number(new URL(String(url), 'http://x').searchParams.get('index'));

describe('ChunkUploader (review S2, S3 and nits)', () => {
  it('S2: an acknowledgement behind the client backs off and fails instead of hot looping', async () => {
    const fetchImpl = vi.fn(async () => ok(1)); // always says "next: 1" while we send index 5
    const up = new ChunkUploader({
      endpoint: '/e',
      tryId: 't',
      fetchImpl,
      maxAttempts: 4,
      ...noWait,
    });
    up.push(chunk(), 5);
    await expect(up.finish(6)).rejects.toThrow(/expects chunk/);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('re-review B1: an ack of the same index (chunk not kept) backs off and gives up instead of flooding', async () => {
    const sleeps: number[] = [];
    const fetchImpl = vi.fn(async (u: RequestInfo | URL) => ok(indexOf(u))); // "next = index": I did not store it
    const up = new ChunkUploader({
      endpoint: '/e',
      tryId: 't',
      fetchImpl,
      maxAttempts: 4,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      backoff: (n) => 100 * (n + 1),
    });
    up.push(chunk(), 0);
    await expect(up.finish(1)).rejects.toThrow(/expects chunk 0, sent 0/);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(sleeps).toEqual([100, 200, 300]);
  });

  it('re-review B1: a chunk the server kept on a later attempt still goes through', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async (u: RequestInfo | URL) =>
      ok(++calls < 3 ? indexOf(u) : indexOf(u) + 1),
    );
    const up = new ChunkUploader({ endpoint: '/e', tryId: 't', fetchImpl, ...noWait });
    up.push(chunk(), 0);
    await up.finish(1);
    expect(fetchImpl).toHaveBeenCalledTimes(4); // 3 attempts at chunk 0, then the final marker
  });

  it('S3: cancel aborts the request in flight and stops retrying', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn(
      (_u: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const statuses: string[] = [];
    const up = new ChunkUploader({
      endpoint: '/e',
      tryId: 't',
      fetchImpl,
      onStatus: (s) => statuses.push(s),
      ...noWait,
    });
    up.push(chunk(), 0);
    await Promise.resolve();
    up.cancel();
    await up.finish(1);
    expect(signal?.aborted).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(statuses).toEqual(['sending']); // nothing reported after cancel, so a late "failed" cannot reach a new take
  });

  it('nit: a 4xx fails at once, but 429 is retried', async () => {
    const bad = vi.fn(async () => new Response('no', { status: 413 }));
    const a = new ChunkUploader({ endpoint: '/e', tryId: 't', fetchImpl: bad, ...noWait });
    a.push(chunk(), 0);
    await expect(a.finish(1)).rejects.toThrow(/413/);
    expect(bad).toHaveBeenCalledOnce();

    let calls = 0;
    const busy = vi.fn(async (u: RequestInfo | URL) =>
      ++calls === 1 ? new Response('', { status: 429 }) : ok(indexOf(u) + 1),
    );
    const b = new ChunkUploader({ endpoint: '/e', tryId: 't', fetchImpl: busy, ...noWait });
    b.push(chunk(), 0);
    await b.finish(1);
    expect(busy).toHaveBeenCalledTimes(3);
  });

  it('nit: nothing more is queued after the uploader gives up', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 503 }));
    const up = new ChunkUploader({
      endpoint: '/e',
      tryId: 't',
      fetchImpl,
      maxAttempts: 2,
      ...noWait,
    });
    up.push(chunk(), 0);
    await expect(up.finish(1)).rejects.toThrow();
    const before = fetchImpl.mock.calls.length;
    up.push(chunk(), 1);
    await Promise.resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(before);
  });

  it('sends the try id in a header, not the URL', async () => {
    const seen: { url: string; header: string | null }[] = [];
    const fetchImpl = vi.fn(async (u: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(u), header: new Headers(init?.headers).get(TRY_HEADER) });
      return ok(indexOf(u) + 1);
    });
    const up = new ChunkUploader({ endpoint: '/e', tryId: 'secret-try-id', fetchImpl, ...noWait });
    up.push(chunk(), 0);
    await up.finish(1);
    expect(seen.every((s) => !s.url.includes('secret-try-id'))).toBe(true);
    expect(seen[0]?.header).toBe('secret-try-id');
  });
});

describe('newTryId (review S1)', () => {
  it('still works where crypto.randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => a.fill(7) });
    try {
      expect(newTryId()).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
