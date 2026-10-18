/** Result of checking one spoken word. Only `match` earns praise; everything else offers another go. */
export type WordCheck = 'match' | 'no_match' | 'unavailable';

/**
 * Check a single spoken word against the expected one.
 * Seam: the real check needs the speech provider (BB-24) and single-word alignment (BB-25),
 * neither of which is on main yet. Until then it reports `unavailable`, and the screen falls back
 * to listen and repeat without scoring. The audio is never stored: it is dropped when this returns.
 */
export async function checkWord(_audio: Blob, _word: string): Promise<WordCheck> {
  return 'unavailable';
}

export function parseWordCheck(value: unknown): WordCheck {
  return value === 'match' || value === 'no_match' ? value : 'unavailable';
}
