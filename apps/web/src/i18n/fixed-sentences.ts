import { catalogs } from './catalog/index.ts';
import { entries, pick } from './messages.ts';
import { LANGS, WORDINGS, type Lang } from './types.ts';

/** Same shape BB-57 reads: sentences by language, addressed by their text. */
export type FixedSentences = Record<Lang, string[]>;

/** Both wordings of every spoken key, in catalog order, without repeats. */
export function buildFixedSentences(): FixedSentences {
  const out = { en: [], fil: [] } as FixedSentences;
  for (const lang of LANGS) {
    const seen = new Set<string>();
    for (const { entry } of entries(catalogs[lang])) {
      if (!entry.spoken) continue;
      for (const wording of WORDINGS) seen.add(pick(entry, wording));
    }
    out[lang] = [...seen];
  }
  return out;
}
