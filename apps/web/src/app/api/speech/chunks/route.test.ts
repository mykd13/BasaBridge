import { describe, expect, it } from 'vitest';
import { POST } from './route';

const MAX_CHUNK_BYTES = 1_000_000;

const call = (
  query: string,
  init: { type?: string; body?: BodyInit; headers?: Record<string, string> } = {},
) =>
  POST(
    new Request(`http://localhost/api/speech/chunks?${query}`, {
      method: 'POST',
      headers: {
        'x-bb-try': 'abcdefgh12',
        'content-type': init.type ?? 'audio/webm;codecs=opus',
        ...init.headers,
      },
      body: init.body ?? new Uint8Array([1, 2, 3]),
    }),
  );

describe('POST /api/speech/chunks', () => {
  it('acknowledges a chunk with the next index', async () => {
    const res = await call('index=4');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ next: 5 });
  });

  it('accepts the empty final marker as octet-stream', async () => {
    const res = await call('index=5&final=1', {
      type: 'application/octet-stream',
      body: new Uint8Array(),
    });
    expect(await res.json()).toEqual({ next: 6 });
  });

  it('rejects a missing or odd index instead of treating it as 0', async () => {
    for (const q of [
      '',
      'index=',
      'index=-1',
      'index=0x10',
      'index=%205',
      'index=1e21',
      'index=1.5',
    ]) {
      expect((await call(q)).status, q).toBe(400);
    }
  });

  it('rejects a missing or malformed try id', async () => {
    expect((await call('index=0', { headers: { 'x-bb-try': 'x' } })).status).toBe(400);
    expect((await call('index=0', { headers: { 'x-bb-try': '' } })).status).toBe(400);
  });

  it('rejects types that are not audio', async () => {
    expect(
      (await call('index=0', { type: 'application/x-www-form-urlencoded', body: 'a=1' })).status,
    ).toBe(415);
    expect((await call('index=0', { type: 'text/html', body: '<p>' })).status).toBe(415);
  });

  it('rejects a body over the cap even when no content-length is declared', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_CHUNK_BYTES));
        controller.enqueue(new Uint8Array(10));
        controller.close();
      },
    });
    const res = await POST(
      new Request('http://localhost/api/speech/chunks?index=0', {
        method: 'POST',
        headers: { 'x-bb-try': 'abcdefgh12', 'content-type': 'audio/webm' },
        body: stream,
        duplex: 'half',
      } as RequestInit),
    );
    expect(res.status).toBe(413);
  });
});
