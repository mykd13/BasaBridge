import { describe, expect, it, vi } from 'vitest';
import { requestMicrophone } from './permissions';
import { MicRecorder, pickMimeType } from './recorder';
import { ChunkUploader } from './uploader';

const failWith = (name: string) => () => Promise.reject(Object.assign(new Error(name), { name }));

describe('requestMicrophone', () => {
  it('reports unsupported when there is no mediaDevices', async () => {
    expect((await requestMicrophone({})).state).toBe('unsupported');
  });

  it('maps a dismissed prompt to denied and a stored block to blocked', async () => {
    const getUserMedia = failWith('NotAllowedError');
    const prompt = { query: async () => ({ state: 'prompt' }) as PermissionStatus };
    const denied = { query: async () => ({ state: 'denied' }) as PermissionStatus };
    expect((await requestMicrophone({ mediaDevices: { getUserMedia }, permissions: prompt })).state).toBe('denied');
    expect((await requestMicrophone({ mediaDevices: { getUserMedia }, permissions: denied })).state).toBe('blocked');
  });

  it('treats an unsupported permission name as unknown, so denied', async () => {
    const permissions = { query: () => Promise.reject(new TypeError('bad name')) };
    const result = await requestMicrophone({
      mediaDevices: { getUserMedia: failWith('NotAllowedError') },
      permissions,
    });
    expect(result.state).toBe('denied');
  });

  it('maps missing and busy devices', async () => {
    expect((await requestMicrophone({ mediaDevices: { getUserMedia: failWith('NotFoundError') } })).state).toBe(
      'no-device',
    );
    expect((await requestMicrophone({ mediaDevices: { getUserMedia: failWith('NotReadableError') } })).state).toBe(
      'unavailable',
    );
  });
});

describe('pickMimeType', () => {
  it('prefers webm opus and falls back to mp4 for Safari', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus');
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBeNull();
  });
});

function fakeRig() {
  const track = { stop: vi.fn(), onended: null as null | (() => void) };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  const rec = {
    state: 'inactive' as RecordingState,
    mimeType: 'audio/webm;codecs=opus',
    ondataavailable: null as null | ((e: BlobEvent) => void),
    onstop: null as null | (() => void),
    start() {
      this.state = 'recording';
    },
    stop() {
      this.ondataavailable?.({ data: new Blob(['last']) } as BlobEvent);
      this.state = 'inactive';
      this.onstop?.();
    },
  };
  const getUserMedia = vi.fn(async () => stream);
  const level = { read: () => 0.5, close: vi.fn() };
  return { track, stream, rec, getUserMedia, level };
}

describe('MicRecorder', () => {
  it('asks for the microphone only when started and releases it on stop', async () => {
    const { track, rec, getUserMedia, level } = fakeRig();
    const chunks: number[] = [];
    const stops: number[] = [];
    const recorder = new MicRecorder(
      { onChunk: (_b, i) => chunks.push(i), onStop: (n) => stops.push(n) },
      {
        mediaDevices: { getUserMedia },
        isTypeSupported: () => true,
        createRecorder: () => rec as unknown as MediaRecorder,
        createLevelReader: () => level,
      },
    );
    expect(getUserMedia).not.toHaveBeenCalled();
    expect((await recorder.start()).ok).toBe(true);
    expect(recorder.recording).toBe(true);
    recorder.stop();
    expect(chunks).toEqual([0]);
    expect(stops).toEqual([1]);
    expect(track.stop).toHaveBeenCalled();
    expect(level.close).toHaveBeenCalled();
    expect(recorder.recording).toBe(false);
  });

  it('releases the microphone when the device is unplugged mid try', async () => {
    const { track, rec, getUserMedia, level } = fakeRig();
    const onStop = vi.fn();
    const recorder = new MicRecorder(
      { onChunk: () => {}, onStop },
      {
        mediaDevices: { getUserMedia },
        isTypeSupported: () => true,
        createRecorder: () => rec as unknown as MediaRecorder,
        createLevelReader: () => level,
      },
    );
    await recorder.start();
    track.onended?.();
    expect(track.stop).toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('discard sends no chunks and no stop event', async () => {
    const { track, rec, getUserMedia, level } = fakeRig();
    const onChunk = vi.fn();
    const onStop = vi.fn();
    const recorder = new MicRecorder(
      { onChunk, onStop },
      {
        mediaDevices: { getUserMedia },
        isTypeSupported: () => true,
        createRecorder: () => rec as unknown as MediaRecorder,
        createLevelReader: () => level,
      },
    );
    await recorder.start();
    recorder.discard();
    expect(onChunk).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });

  it('reports a failure without opening anything when permission is refused', async () => {
    const recorder = new MicRecorder(
      { onChunk: () => {} },
      { mediaDevices: { getUserMedia: failWith('NotFoundError') }, isTypeSupported: () => true },
    );
    expect(await recorder.start()).toEqual({ ok: false, state: 'no-device' });
  });
});

const ok = (next: number) => new Response(JSON.stringify({ next }), { status: 200 });
const chunk = () => new Blob(['x'], { type: 'audio/webm' });
const noWait = { sleep: async () => {}, backoff: () => 0 };

describe('ChunkUploader', () => {
  it('sends chunks in order and then the final marker', async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      urls.push(String(url));
      return ok(Number(new URL(String(url), 'http://x').searchParams.get('index')) + 1);
    });
    const up = new ChunkUploader({ endpoint: '/api/speech/chunks', tryId: 't1', fetchImpl, ...noWait });
    up.push(chunk(), 0);
    up.push(chunk(), 1);
    await up.finish(2);
    expect(urls).toEqual([
      '/api/speech/chunks?try=t1&index=0',
      '/api/speech/chunks?try=t1&index=1',
      '/api/speech/chunks?try=t1&index=2&final=1',
    ]);
  });

  it('retries a dropped chunk without losing it or reordering', async () => {
    let calls = 0;
    const seen: number[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      calls += 1;
      if (calls <= 2) throw new TypeError('network down');
      const index = Number(new URL(String(url), 'http://x').searchParams.get('index'));
      seen.push(index);
      return ok(index + 1);
    });
    const statuses: string[] = [];
    const up = new ChunkUploader({
      endpoint: '/e',
      tryId: 't',
      fetchImpl,
      onStatus: (s) => statuses.push(s),
      ...noWait,
    });
    up.push(chunk(), 0);
    up.push(chunk(), 1);
    await up.finish(2);
    expect(seen).toEqual([0, 1, 2]);
    expect(statuses).toContain('retrying');
    expect(statuses.at(-1)).toBe('done');
  });

  it('skips ahead when the server already has a chunk whose reply was lost', async () => {
    const seen: number[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const index = Number(new URL(String(url), 'http://x').searchParams.get('index'));
      seen.push(index);
      return ok(index === 0 ? 2 : index + 1);
    });
    const up = new ChunkUploader({ endpoint: '/e', tryId: 't', fetchImpl, ...noWait });
    up.push(chunk(), 0);
    up.push(chunk(), 1);
    await up.finish(2);
    expect(seen).toEqual([0, 2]);
  });

  it('fails visibly after too many failures in a row', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 503 }));
    const up = new ChunkUploader({ endpoint: '/e', tryId: 't', fetchImpl, maxAttempts: 3, ...noWait });
    up.push(chunk(), 0);
    await expect(up.finish(1)).rejects.toThrow(/rejected/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('sends nothing before the first push', () => {
    const fetchImpl = vi.fn();
    new ChunkUploader({ endpoint: '/e', tryId: 't', fetchImpl, ...noWait });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
