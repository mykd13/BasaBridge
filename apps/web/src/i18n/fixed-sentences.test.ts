import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogs } from './catalog/index.ts';
import { buildFixedSentences } from './fixed-sentences.ts';
import { entries } from './messages.ts';

const committed = new URL('../audio/fixed-sentences.json', import.meta.url);

describe('fixed sentences for audio', () => {
  it('matches the committed file. Run pnpm i18n:audio when this fails', () => {
    expect(JSON.parse(readFileSync(committed, 'utf8'))).toEqual(buildFixedSentences());
  });

  it('includes both wordings of every spoken key', () => {
    const sentences = buildFixedSentences();
    expect(sentences.en).toContain('Read out loud.');
    expect(sentences.en).toContain('Read out loud. Understand more.');
    expect(sentences.fil).toContain('Magbasa nang malakas.');
  });

  it('rejects spoken keys with placeholders', () => {
    for (const [lang, catalog] of Object.entries(catalogs)) {
      for (const { key, entry } of entries(catalog)) {
        if (!entry.spoken) continue;
        for (const text of [entry.standard, entry.simple ?? '']) {
          expect(text, `${lang} ${key} is spoken but has a placeholder`).not.toMatch(/[{}]/);
        }
      }
    }
  });
});
