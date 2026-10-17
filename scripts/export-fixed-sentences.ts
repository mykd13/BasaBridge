/**
 * Write both wordings of every spoken catalog key to the list BB-57 turns into audio.
 * Run with: pnpm i18n:audio. A test fails when the committed file is out of date.
 * Node 24 runs the TypeScript imports directly. The output goes through Prettier so that
 * `pnpm format:check` accepts it.
 */
import { writeFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { buildFixedSentences } from '../apps/web/src/i18n/fixed-sentences.ts';

const target = new URL('../apps/web/src/audio/fixed-sentences.json', import.meta.url);
const options = (await resolveConfig(target.pathname)) ?? {};
const text = await format(JSON.stringify(buildFixedSentences()), {
  ...options,
  filepath: target.pathname,
});
await writeFile(target, text);
console.info('Fixed sentences written to apps/web/src/audio/fixed-sentences.json');
