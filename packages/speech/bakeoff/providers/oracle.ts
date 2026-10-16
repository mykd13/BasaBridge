/**
 * Offline stand-in used to test the harness end to end without sending anything anywhere.
 * It returns the human transcript with deterministic damage: every 13th word dropped, every
 * 17th word swapped and given low confidence. Its numbers mean nothing about
 * any vendor and it is excluded from real reports unless asked for by name.
 */
import { normaliseWords } from '../text.ts';
import type { BakeoffOptions, BakeoffProvider, HeardWord, ProviderResult } from '../types.ts';

export function createOracle(): BakeoffProvider {
  const run = async (_audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const said = options.selfTestWords ?? [];
    const words: HeardWord[] = [];
    said.forEach((text, i) => {
      const start = 0.5 + i * 0.4;
      if (i % 13 === 12) return;
      const swapped = i % 17 === 16;
      words.push({
        text: swapped ? `${text}x` : text,
        start,
        end: start + 0.3,
        confidence: swapped ? 0.4 : 0.95,
      });
    });
    const assessment = options.bias
      ? normaliseWords(options.referenceText).map((_, i) => (i % 13 === 12 ? 'miscue' : 'ok'))
      : undefined;
    return assessment ? { words, assessment } : { words };
  };
  return {
    name: 'oracle',
    biasing: 'none (offline test double)',
    streaming: false,
    modes: ['plain', 'biased'],
    run,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}
