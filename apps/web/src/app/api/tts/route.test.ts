import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { resetRateLimits } from '../../../lib/rate-limit';

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const realFetch = globalThis.fetch;

beforeEach(() => {
  resetRateLimits();
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.env.TTS_API_KEY = 'k';
  process.env.TTS_REGION = 'r';
  delete process.env.TTS_PROVIDER;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('POST /api/tts', () => {
  it('rejects bad JSON', async () => {
    expect((await post('{nope')).status).toBe(400);
  });

  it('rejects empty text, long text and a bad language', async () => {
    expect((await post({ text: '  ', lang: 'en' })).status).toBe(400);
    expect((await post({ text: 'a'.repeat(601), lang: 'en' })).status).toBe(400);
    expect((await post({ text: 'a'.repeat(600), lang: 'xx' })).status).toBe(400);
  });

  it('answers 503 when no key is set', async () => {
    delete process.env.TTS_API_KEY;
    expect((await post({ text: 'Hello', lang: 'en' })).status).toBe(503);
  });

  it('answers 503 for an unknown provider name', async () => {
    process.env.TTS_PROVIDER = 'other';
    expect((await post({ text: 'Hello', lang: 'en' })).status).toBe(503);
  });

  it('answers 503 and logs the status, never the text, when the provider fails', async () => {
    globalThis.fetch = vi.fn(async () => new Response('no', { status: 429 })) as typeof fetch;
    const res = await post({ text: 'Secret question text', lang: 'en' });
    expect(res.status).toBe(503);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain('429');
    expect(logged).not.toContain('Secret question text');
  });

  it('returns audio and logs cost without the text', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(new Uint8Array([1, 2]), { status: 200 }),
    ) as typeof fetch;
    const res = await post({ text: 'Unique route sentence', lang: 'fil' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    const logged = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logged).toContain('tts_cost');
    expect(logged).not.toContain('Unique route sentence');
  });

  it('limits how often one client can ask', async () => {
    let last = 0;
    for (let i = 0; i < 31; i += 1) {
      last = (await post({ text: '', lang: 'en' }, { 'x-forwarded-for': '1.2.3.4' })).status;
    }
    expect(last).toBe(429);
  });
});
