import { catalogs } from '@/i18n/catalog';
import { isEntry, pick } from '@/i18n/messages';
import type { Catalog, Entry, Lang } from '@/i18n/types';

/** The catalog entry at a dotted key such as `legal.kids.what1`, or null. */
export function catalogEntry(lang: Lang, key: string): Entry | null {
  let node: Entry | Catalog | undefined = catalogs[lang];
  for (const part of key.split('.')) {
    if (!node || isEntry(node)) return null;
    node = node[part];
  }
  return node && isEntry(node) ? node : null;
}

/**
 * One sentence of the kids summary, always in the simple wording. Throws for a key that is
 * missing or not marked `spoken`, because every sentence on that page must have audio.
 */
export function kidsSentence(lang: Lang, key: string): string {
  const entry = catalogEntry(lang, key);
  if (!entry) throw new Error(`Missing catalog key ${key} (${lang}) in a legal document`);
  if (!entry.spoken) throw new Error(`Catalog key ${key} must be marked spoken`);
  return pick(entry, 'simple');
}
