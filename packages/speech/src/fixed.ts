/**
 * Build-time audio for fixed interface sentences (ADR 0004, BB-57).
 * One mp3 per sentence per language, named by the same hash the on-demand cache uses,
 * so the browser can find a file from the text alone.
 */
import { cacheKey, normaliseText, type TtsCostEvent, type TtsLang, type TtsProvider } from './tts';

export type FixedSentences = Record<TtsLang, string[]>;

/** Where static files go. The build script backs this with the file system. */
export interface FixedAudioStore {
  exists(path: string): Promise<boolean>;
  write(path: string, bytes: Uint8Array): Promise<void>;
}

export interface FixedAudioResult {
  generated: number;
  skipped: number;
}

/** Public URL of a fixed sentence's audio file. */
export async function fixedAudioPath(text: string, lang: TtsLang): Promise<string> {
  return `/audio/${lang}/${await cacheKey(text, lang)}.mp3`;
}

/** Generate any missing files. Existing files are left alone, so a rebuild costs nothing. */
export async function generateFixedAudio(
  sentences: FixedSentences,
  options: {
    provider: TtsProvider;
    store: FixedAudioStore;
    /** Folder the public paths map to, for example "apps/web/public". */
    publicDir: string;
    costPerMillionChars: number;
    onCost?: (event: TtsCostEvent) => void;
  },
): Promise<FixedAudioResult> {
  const result: FixedAudioResult = { generated: 0, skipped: 0 };
  for (const lang of ['en', 'fil'] as const) {
    const unique = new Set(sentences[lang].map(normaliseText).filter(Boolean));
    for (const text of unique) {
      const target = `${options.publicDir}${await fixedAudioPath(text, lang)}`;
      if (await options.store.exists(target)) {
        result.skipped += 1;
        continue;
      }
      const audio = await options.provider.synthesize(text, lang);
      await options.store.write(target, audio.bytes);
      const characters = [...text].length;
      options.onCost?.({
        provider: options.provider.name,
        lang,
        characters,
        cacheHit: false,
        estimatedCostUsd: (characters / 1_000_000) * options.costPerMillionChars,
      });
      result.generated += 1;
    }
  }
  return result;
}
