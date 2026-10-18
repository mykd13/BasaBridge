import { describe, expect, it, vi } from 'vitest';
import {
  MemoryTtsCache,
  azureTtsProvider,
  cacheKey,
  speakCached,
  type TtsCostEvent,
  type TtsProvider,
} from './tts';

const fakeProvider = (): TtsProvider & { calls: number } => {
  const p = {
    name: 'fake',
    calls: 0,
    async synthesize() {
      p.calls += 1;
      return { bytes: new Uint8Array([1, 2, 3]), contentType: 'audio/mpeg' };
    },
  };
  return p;
};

describe('cacheKey', () => {
  it('is stable and ignores extra whitespace', async () => {
    expect(await cacheKey('Read  the story ', 'en')).toBe(await cacheKey('Read the story', 'en'));
  });
  it('differs by language and by text', async () => {
    const a = await cacheKey('Hello', 'en');
    expect(a).not.toBe(await cacheKey('Hello', 'fil'));
    expect(a).not.toBe(await cacheKey('Hello!', 'en'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('speakCached', () => {
  it('generates each sentence once', async () => {
    const provider = fakeProvider();
    const cache = new MemoryTtsCache();
    const base = { provider, cache, costPerMillionChars: 16 };
    const first = await speakCached('Tap the button', 'en', base);
    const second = await speakCached('Tap  the button', 'en', base);
    expect(provider.calls).toBe(1);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.key).toBe(first.key);
  });

  it('logs characters and cost, never the text', async () => {
    const events: TtsCostEvent[] = [];
    const base = {
      provider: fakeProvider(),
      cache: new MemoryTtsCache(),
      costPerMillionChars: 16,
      onCost: (e: TtsCostEvent) => events.push(e),
    };
    await speakCached('Maria reads', 'fil', base);
    await speakCached('Maria reads', 'fil', base);
    expect(events[0]).toMatchObject({ characters: 11, cacheHit: false, lang: 'fil' });
    expect(events[0]!.estimatedCostUsd).toBeCloseTo(0.000176);
    expect(events[1]).toMatchObject({ cacheHit: true, estimatedCostUsd: 0 });
    expect(JSON.stringify(events)).not.toContain('Maria');
  });

  it('shares one provider call between requests made at the same time', async () => {
    let calls = 0;
    let release: () => void = () => {};
    const slow: TtsProvider = {
      name: 'slow',
      synthesize: () => {
        calls += 1;
        return new Promise((resolve) => {
          release = () => resolve({ bytes: new Uint8Array([1]), contentType: 'audio/mpeg' });
        });
      },
    };
    const base = { provider: slow, cache: new MemoryTtsCache(), costPerMillionChars: 16 };
    const all = Promise.all(
      Array.from({ length: 30 }, () => speakCached('Same question', 'en', base)),
    );
    // Wait until the provider was called, then let every other caller reach the shared request.
    await vi.waitFor(() => expect(calls).toBe(1));
    await new Promise((r) => setTimeout(r, 50));
    release();
    const results = await all;
    expect(calls).toBe(1);
    expect(results.every((r) => r.bytes.length === 1)).toBe(true);
  });

  it('keeps the cache under its size cap', async () => {
    const cache = new MemoryTtsCache(2);
    const audio = { bytes: new Uint8Array([1]), contentType: 'audio/mpeg' };
    await cache.set('a', audio);
    await cache.set('b', audio);
    await cache.get('a');
    await cache.set('c', audio);
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('a')).not.toBeNull();
    expect(await cache.get('c')).not.toBeNull();
  });

  it('rejects empty text', async () => {
    await expect(
      speakCached('  ', 'en', {
        provider: fakeProvider(),
        cache: new MemoryTtsCache(),
        costPerMillionChars: 0,
      }),
    ).rejects.toThrow();
  });
});

describe('azureTtsProvider', () => {
  it('posts escaped SSML with the language voice', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([9]), { status: 200 }));
    const p = azureTtsProvider({ apiKey: 'k', region: 'southeastasia', fetch: fetchMock });
    const audio = await p.synthesize('A & B', 'fil');
    expect(audio.contentType).toBe('audio/mpeg');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('southeastasia.tts.speech.microsoft.com');
    expect(String(init.body)).toContain('fil-PH');
    expect(String(init.body)).toContain('A &amp; B');
  });
  it('rejects a 200 response with no audio', async () => {
    const p = azureTtsProvider({
      apiKey: 'k',
      region: 'r',
      fetch: async () => new Response(new Uint8Array(), { status: 200 }),
    });
    await expect(p.synthesize('x', 'en')).rejects.toThrow('no audio');
  });
  it('throws on a failed response', async () => {
    const p = azureTtsProvider({
      apiKey: 'k',
      region: 'r',
      fetch: async () => new Response('no', { status: 500 }),
    });
    await expect(p.synthesize('x', 'en')).rejects.toThrow('500');
  });
});
