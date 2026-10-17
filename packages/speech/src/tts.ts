/**
 * Interface audio (ADR 0004, BB-57). Fixed sentences are pre-generated at build time.
 * Dynamic text is spoken on demand and cached by a hash of the text and language,
 * so each sentence is generated once. Nothing here logs or stores a learner's name.
 */

export type TtsLang = 'en' | 'fil';

export interface TtsAudio {
  bytes: Uint8Array;
  contentType: string;
}

/** A text-to-speech provider adapter. Swapping provider never touches callers. */
export interface TtsProvider {
  readonly name: string;
  synthesize(text: string, lang: TtsLang, signal?: AbortSignal): Promise<TtsAudio>;
}

/** Where generated audio is kept. In-memory until the blob store exists (BB-2). */
export interface TtsCache {
  get(key: string): Promise<TtsAudio | null>;
  set(key: string, audio: TtsAudio): Promise<void>;
}

/** Least recently used cache with a size cap, so unique strings cannot fill memory. */
export class MemoryTtsCache implements TtsCache {
  private readonly items = new Map<string, TtsAudio>();
  private readonly maxEntries: number;
  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }
  async get(key: string): Promise<TtsAudio | null> {
    const hit = this.items.get(key);
    if (!hit) return null;
    this.items.delete(key);
    this.items.set(key, hit);
    return hit;
  }
  async set(key: string, audio: TtsAudio): Promise<void> {
    this.items.delete(key);
    this.items.set(key, audio);
    while (this.items.size > this.maxEntries) {
      const oldest = this.items.keys().next().value;
      if (oldest === undefined) break;
      this.items.delete(oldest);
    }
  }
}

/** One line per spoken request, for cost tracking (BB-39). Never carries the text. */
export interface TtsCostEvent {
  provider: string;
  lang: TtsLang;
  characters: number;
  cacheHit: boolean;
  /** Estimated cost in US dollars. Zero on a cache hit. */
  estimatedCostUsd: number;
}

export function normaliseText(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Stable key for a sentence in a language: sha-256 hex of "<lang>:<text>". */
export async function cacheKey(text: string, lang: TtsLang): Promise<string> {
  const data = new TextEncoder().encode(`${lang}:${normaliseText(text)}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface SpeakOptions {
  provider: TtsProvider;
  cache: TtsCache;
  /** US dollars per one million characters, from configuration. */
  costPerMillionChars: number;
  onCost?: (event: TtsCostEvent) => void;
  signal?: AbortSignal;
}

export interface SpokenAudio extends TtsAudio {
  key: string;
  cacheHit: boolean;
}

/** Requests being generated right now, so a class asking for one sentence makes one provider call. */
const inFlight = new Map<string, Promise<TtsAudio>>();

/** Speak a sentence: serve from the cache, or generate it once and store it. */
export async function speakCached(
  text: string,
  lang: TtsLang,
  options: SpeakOptions,
): Promise<SpokenAudio> {
  const clean = normaliseText(text);
  if (!clean) throw new Error('Nothing to speak');
  const key = await cacheKey(clean, lang);
  const characters = [...clean].length;
  const hit = await options.cache.get(key);
  if (hit) {
    options.onCost?.({
      provider: options.provider.name,
      lang,
      characters,
      cacheHit: true,
      estimatedCostUsd: 0,
    });
    return { ...hit, key, cacheHit: true };
  }
  const flightKey = `${options.provider.name}:${key}`;
  let pending = inFlight.get(flightKey);
  const shared = pending !== undefined;
  if (!pending) {
    pending = options.provider.synthesize(clean, lang, options.signal).then(async (audio) => {
      await options.cache.set(key, audio);
      return audio;
    });
    inFlight.set(flightKey, pending);
    const clear = () => inFlight.delete(flightKey);
    pending.then(clear, clear);
  }
  const audio = await pending;
  if (shared) return { ...audio, key, cacheHit: true };
  options.onCost?.({
    provider: options.provider.name,
    lang,
    characters,
    cacheHit: false,
    estimatedCostUsd: (characters / 1_000_000) * options.costPerMillionChars,
  });
  return { ...audio, key, cacheHit: false };
}

const AZURE_VOICES: Record<TtsLang, { locale: string; voice: string }> = {
  en: { locale: 'en-US', voice: 'en-US-AnaNeural' },
  fil: { locale: 'fil-PH', voice: 'fil-PH-BlessicaNeural' },
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface AzureTtsConfig {
  apiKey: string;
  region: string;
  fetch?: typeof fetch;
}

/** Azure Speech text-to-speech over its REST API (docs/adr/0005-tts-provider.md). */
export function azureTtsProvider(config: AzureTtsConfig): TtsProvider {
  const doFetch = config.fetch ?? fetch;
  return {
    name: 'azure-speech',
    async synthesize(text, lang, signal) {
      const { locale, voice } = AZURE_VOICES[lang];
      const ssml =
        `<speak version="1.0" xml:lang="${locale}" xmlns="http://www.w3.org/2001/10/synthesis">` +
        `<voice name="${voice}">${escapeXml(text)}</voice></speak>`;
      const res = await doFetch(
        `https://${config.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': config.apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          },
          body: ssml,
          signal,
        },
      );
      if (!res.ok) throw new Error(`Text-to-speech failed with status ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0) throw new Error('Text-to-speech returned no audio');
      return { bytes, contentType: 'audio/mpeg' };
    },
  };
}
