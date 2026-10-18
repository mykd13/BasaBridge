/* global console, URL */
// Builds src/vocab/word-list.json from the NGSL 1.2 files in src/vocab/data (BB-72).
// Run with `pnpm --filter @basabridge/story-ai word-list` after replacing the data files.
// Each ranked entry is the lemma and its forms joined by commas; its position is its frequency rank.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/vocab/', import.meta.url));
// trimStart also drops a byte order mark.
const read = (name) => readFileSync(`${dir}data/${name}`, 'utf8').trimStart();
const lines = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('##'));

const forms = new Map();
for (const line of lines(read('NGSL_12_lemmatized_for_research.csv'))) {
  const words = line.split(',').map((w) => w.trim().toLowerCase());
  forms.set(words[0], [...new Set(words)]);
}

const ranked = lines(read('NGSL_12_stats.csv'))
  .slice(1)
  .map((line) => line.split(','))
  .map(([lemma, rank]) => ({ lemma: lemma.trim().toLowerCase(), rank: Number(rank) }))
  .sort((a, b) => a.rank - b.rank)
  .map(({ lemma, rank }, i) => {
    if (rank !== i + 1) throw new Error(`Rank ${rank} for ${lemma} is out of order.`);
    const f = forms.get(lemma);
    if (!f) throw new Error(`${lemma} has no forms in the lemmatized list.`);
    return f.join(',');
  });
if (ranked.length !== forms.size) {
  throw new Error(`Stats have ${ranked.length} lemmas but the lemmatized list has ${forms.size}.`);
}

const supplementary = lines(read('SUP_lemmatized.csv')).map((line) =>
  [...new Set(line.split(',').map((w) => w.trim().toLowerCase()))].join(','),
);

const out = {
  source: 'NGSL 1.2 by Browne, Culligan and Phillips (CC BY-SA 4.0). See src/vocab/README.md.',
  ranked,
  supplementary,
};
writeFileSync(`${dir}word-list.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `word-list.json: ${ranked.length} ranked lemmas, ${supplementary.length} supplementary.`,
);
