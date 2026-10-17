import { MemoryTtsCache, azureTtsProvider, type TtsProvider } from '@basabridge/speech';

/** In memory until the blob store exists (BB-2). Swap this one line then. */
export const ttsCache = new MemoryTtsCache();

export function ttsCostPerMillionChars(): number {
  const n = Number(process.env.TTS_COST_PER_MILLION_CHARS);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** The configured provider, or null when text-to-speech is not set up. The browser then uses its own voices. */
export function getTtsProvider(): TtsProvider | null {
  const apiKey = process.env.TTS_API_KEY;
  const region = process.env.TTS_REGION;
  if (!apiKey || !region) return null;
  return azureTtsProvider({ apiKey, region });
}
