import type { WordResult } from '@basabridge/contracts';

/** The analysed words of one try and when it happened. */
export interface TryWords {
  at: Date;
  words: WordResult[];
}

const FLAGGED: ReadonlySet<WordResult['outcome']> = new Set(['substitution', 'omission']);

/**
 * Words the reading analysis flagged, most recent try first, each word once.
 * Low-confidence words and words marked as misheard are not flagged here.
 */
export function pickFlaggedWords(tries: TryWords[], limit = 10): string[] {
  const ordered = [...tries].sort((a, b) => b.at.getTime() - a.at.getTime());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of ordered) {
    for (const w of t.words) {
      if (!w.expected || w.markedMisheard || !FLAGGED.has(w.outcome)) continue;
      const word = w.expected.toLowerCase().replace(/[^a-z']/g, '');
      if (word.length === 0 || seen.has(word)) continue;
      seen.add(word);
      out.push(word);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * The learner's flagged words, newest first.
 * Seam: learner data must be read through the authorization layer (BB-10), which is not on main yet.
 * Until it lands this returns an empty list, so the screen shows its empty state.
 */
export async function getFlaggedWords(): Promise<string[]> {
  return [];
}
