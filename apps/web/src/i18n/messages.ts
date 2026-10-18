import type { Catalog, Entry, Lang, Messages, Wording } from './types.ts';
import { catalogs, type en } from './catalog/index.ts';

export function isEntry(node: Entry | Catalog): node is Entry {
  return typeof node.standard === 'string';
}

/** The text for one entry. The simple wording falls back to standard when there is none. */
export function pick(entry: Entry, wording: Wording): string {
  return wording === 'simple' ? (entry.simple ?? entry.standard) : entry.standard;
}

/** Turn a catalog into the message tree next-intl reads, using one wording. */
export function flatten<T extends Catalog>(catalog: T, wording: Wording): Messages<T> {
  const out: Record<string, unknown> = {};
  for (const [key, node] of Object.entries(catalog)) {
    out[key] = isEntry(node) ? pick(node, wording) : flatten(node, wording);
  }
  return out as Messages<T>;
}

/** Every entry with its dotted key, in catalog order. */
export function entries(catalog: Catalog, prefix = ''): Array<{ key: string; entry: Entry }> {
  return Object.entries(catalog).flatMap(([key, node]) =>
    isEntry(node) ? [{ key: `${prefix}${key}`, entry: node }] : entries(node, `${prefix}${key}.`),
  );
}

export function messagesFor(lang: Lang, wording: Wording): Messages<typeof en> {
  return flatten(catalogs[lang], wording) as Messages<typeof en>;
}
