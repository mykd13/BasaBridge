/**
 * The word-frequency list behind the vocabulary check (BB-72): NGSL 1.2, ranked by frequency, with
 * every inflected form of each word. See README.md in this folder for the source and licence.
 * Data only: no model calls, no learner data.
 */
import list from './word-list.json';

/** Number of ranked words in the list. A tier's maxRank can be at most this. */
export const WORD_LIST_SIZE = list.ranked.length;

const RANKS = new Map<string, number>();
list.ranked.forEach((entry, i) => {
  for (const form of entry.split(',')) if (!RANKS.has(form)) RANKS.set(form, i + 1);
});

/** Days, months and number words. NGSL keeps them out of the ranks; every tier may use them. */
const SUPPLEMENTARY = new Set(list.supplementary.flatMap((entry) => entry.split(',')));

/** Titles before a name. The sentence splitter keeps them, so they reach the check. */
const TITLES = new Set(['mr', 'mrs', 'ms', 'dr']);

/**
 * Frequency rank of a lowercase word form (1 is the most common word), 1 for days, months, number
 * words and titles, or null when the word is not on the list.
 */
export function wordRank(form: string): number | null {
  if (SUPPLEMENTARY.has(form) || TITLES.has(form)) return 1;
  return RANKS.get(form) ?? null;
}
