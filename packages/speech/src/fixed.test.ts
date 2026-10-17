import { describe, expect, it } from 'vitest';
import { fixedAudioPath, generateFixedAudio, type FixedAudioStore } from './fixed';
import { cacheKey, type TtsProvider } from './tts';

const memoryStore = (): FixedAudioStore & { files: Map<string, Uint8Array> } => {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    async exists(p) {
      return files.has(p);
    },
    async write(p, bytes) {
      files.set(p, bytes);
    },
  };
};

const provider = (): TtsProvider & { calls: string[] } => {
  const p = {
    name: 'fake',
    calls: [] as string[],
    async synthesize(text: string, lang: string) {
      p.calls.push(`${lang}:${text}`);
      return { bytes: new Uint8Array([1]), contentType: 'audio/mpeg' };
    },
  };
  return p;
};

describe('generateFixedAudio', () => {
  it('writes one file per sentence per language, named by hash', async () => {
    const store = memoryStore();
    const p = provider();
    const res = await generateFixedAudio(
      { en: ['Tap start'], fil: ['Pindutin ang simula'] },
      { provider: p, store, publicDir: 'public', costPerMillionChars: 16 },
    );
    expect(res).toEqual({ generated: 2, skipped: 0 });
    const enHash = await cacheKey('Tap start', 'en');
    expect(store.files.has(`public/audio/en/${enHash}.mp3`)).toBe(true);
    expect(await fixedAudioPath('Tap start', 'en')).toBe(`/audio/en/${enHash}.mp3`);
    expect([...store.files.keys()].some((k) => k.startsWith('public/audio/fil/'))).toBe(true);
  });

  it('skips files that exist and duplicates in the list', async () => {
    const store = memoryStore();
    const p = provider();
    const opts = { provider: p, store, publicDir: 'public', costPerMillionChars: 16 };
    const sentences = { en: ['Hello', 'Hello ', 'Hello'], fil: [] };
    await generateFixedAudio(sentences, opts);
    const second = await generateFixedAudio(sentences, opts);
    expect(p.calls).toHaveLength(1);
    expect(second).toEqual({ generated: 0, skipped: 1 });
  });
});
