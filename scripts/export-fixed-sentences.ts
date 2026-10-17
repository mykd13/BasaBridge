/**
 * Write both wordings of every spoken catalog key to the list BB-57 turns into audio.
 * Run with: pnpm i18n:audio. A test fails when the committed file is out of date.
 * Node 24 runs the TypeScript imports directly.
 */
import { writeFile } from 'node:fs/promises';
import { buildFixedSentences } from '../apps/web/src/i18n/fixed-sentences.ts';

const target = new URL('../apps/web/src/audio/fixed-sentences.json', import.meta.url);
await writeFile(target, `${JSON.stringify(buildFixedSentences(), null, 2)}\n`);
console.info('Fixed sentences written to apps/web/src/audio/fixed-sentences.json');
