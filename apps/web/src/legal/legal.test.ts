import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/catalog/en';
import { fil } from '@/i18n/catalog/fil';
import { LANGS, type Lang } from '@/i18n/types';
import hashes from './content-hashes.json';
import { catalogKeys, headingOutline, parseMarkdown } from './markdown';
import { PROVIDERS } from './providers';
import { catalogEntry, kidsSentence } from './sentences';
import {
  LEGAL_KINDS,
  LEGAL_VERSIONS,
  getLegalDoc,
  legalFileName,
  legalDir,
  type LegalKind,
} from './versions';

const blocks = (kind: LegalKind, lang: Lang) => parseMarkdown(getLegalDoc(kind, lang).source);

/** Text of a block list with catalog sentences filled in, for reading the visible words. */
function visibleText(kind: LegalKind, lang: Lang): string {
  return getLegalDoc(kind, lang)
    .source.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\[([A-Za-z0-9_.]+)\]\]/g, (_m, key: string) => kidsSentence(lang, key));
}

const DRAFT_MARKER: Record<Lang, RegExp> = {
  en: /awaiting qualified review/i,
  fil: /naghihintay ng kwalipikadong pagsusuri/i,
};

describe('legal documents', () => {
  it('have whole-number versions, because consents.version is an integer', () => {
    for (const kind of LEGAL_KINDS) {
      expect(Number.isInteger(LEGAL_VERSIONS[kind]), kind).toBe(true);
      expect(LEGAL_VERSIONS[kind], kind).toBeGreaterThanOrEqual(1);
    }
  });

  it('read for every kind and language', () => {
    for (const kind of LEGAL_KINDS) {
      for (const lang of LANGS) {
        expect(getLegalDoc(kind, lang)).toMatchObject({
          kind,
          lang,
          version: LEGAL_VERSIONS[kind],
        });
      }
    }
  });

  it('name the kids files with the simple wording', () => {
    expect(legalFileName('kidsSummary', 'en')).toBe('kids.en.simple.md');
    expect(legalFileName('kidsSummary', 'fil')).toBe('kids.fil.simple.md');
  });

  it('have the same headings in English and Filipino', () => {
    for (const kind of LEGAL_KINDS) {
      expect(headingOutline(blocks(kind, 'fil')), kind).toEqual(headingOutline(blocks(kind, 'en')));
      expect(headingOutline(blocks(kind, 'en')).length, kind).toBeGreaterThan(2);
    }
  });

  it('start with one title heading', () => {
    for (const kind of LEGAL_KINDS) {
      for (const lang of LANGS) {
        const first = blocks(kind, lang).find((b) => b.type === 'heading');
        expect(first, `${kind} ${lang}`).toMatchObject({ level: 1 });
      }
    }
  });

  it('say on screen that they are awaiting qualified review', () => {
    for (const kind of LEGAL_KINDS) {
      for (const lang of LANGS) {
        expect(visibleText(kind, lang), `${kind} ${lang}`).toMatch(DRAFT_MARKER[lang]);
      }
    }
  });

  it('use no em or en dashes', () => {
    for (const kind of LEGAL_KINDS) {
      for (const lang of LANGS)
        expect(visibleText(kind, lang), `${kind} ${lang}`).not.toMatch(/[–—]/);
    }
  });

  it('use the same catalog sentences in English and Filipino', () => {
    expect(catalogKeys(blocks('kidsSummary', 'fil'))).toEqual(
      catalogKeys(blocks('kidsSummary', 'en')),
    );
  });

  it('draw every kids sentence from a spoken catalog key', () => {
    for (const lang of LANGS) {
      const keys = catalogKeys(blocks('kidsSummary', lang));
      expect(keys.length).toBeGreaterThan(10);
      for (const key of keys) {
        expect(catalogEntry(lang, key)?.spoken, `${lang} ${key}`).toBe(true);
        expect(kidsSentence(lang, key)).not.toMatch(/[{}<>]/);
      }
    }
  });

  it('keep every legal.kids catalog key in the kids summary', () => {
    for (const [lang, catalog] of [
      ['en', en],
      ['fil', fil],
    ] as const) {
      const used = new Set(catalogKeys(blocks('kidsSummary', lang)));
      const defined = Object.keys(catalog.legal.kids).map((k) => `legal.kids.${k}`);
      expect([...used].sort(), lang).toEqual(defined.sort());
    }
  });

  it('keep the kids sentences short', () => {
    for (const lang of LANGS) {
      for (const key of catalogKeys(blocks('kidsSummary', lang))) {
        const words = kidsSentence(lang, key).trim().split(/\s+/).length;
        expect(words, `${lang} ${key}`).toBeLessThanOrEqual(24);
      }
    }
  });

  it('put a provider table in the privacy notice', () => {
    expect(blocks('privacy', 'en').some((b) => b.type === 'providers')).toBe(true);
    expect(blocks('privacy', 'fil').some((b) => b.type === 'providers')).toBe(true);
  });
});

/** Everything a reader sees in one document, in both languages. */
function contentHash(kind: LegalKind): string {
  const hash = createHash('sha256');
  for (const lang of LANGS) {
    hash.update(readFileSync(`${legalDir()}/${legalFileName(kind, lang)}`, 'utf8'));
  }
  if (kind === 'kidsSummary') hash.update(JSON.stringify([en.legal.kids, fil.legal.kids]));
  if (kind === 'privacy') hash.update(JSON.stringify(PROVIDERS));
  return hash.digest('hex');
}

describe('legal versions', () => {
  it.each(LEGAL_KINDS)(
    'bump %s when its text changes. Update content-hashes.json with the new version and hash',
    (kind) => {
      const recorded = hashes[kind];
      const current = contentHash(kind);
      expect(
        { version: recorded.version, sha256: recorded.sha256 },
        `The text of ${kind} changed. Raise LEGAL_VERSIONS.${kind} in versions.ts, then record ` +
          `{ "version": N, "sha256": "${current}" } in content-hashes.json`,
      ).toEqual({ version: LEGAL_VERSIONS[kind], sha256: current });
    },
  );
});
