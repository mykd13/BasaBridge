/**
 * Generate audio for fixed interface sentences (BB-57). Run with: pnpm audio:generate
 * Reads apps/web/src/audio/fixed-sentences.json, writes apps/web/public/audio/<lang>/<hash>.mp3
 * and skips files that already exist. Until the i18n catalog exists (BB-58) the JSON list is the source.
 * Needs TTS_API_KEY and TTS_REGION (see example.env). Node 24 runs the TypeScript imports directly.
 */
/* global process, console */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { azureTtsProvider } from '../packages/speech/src/tts.ts';
import { generateFixedAudio } from '../packages/speech/src/fixed.ts';

const apiKey = process.env.TTS_API_KEY;
const region = process.env.TTS_REGION;
if (!apiKey || !region) {
  console.error('Set TTS_API_KEY and TTS_REGION first (see example.env).');
  process.exit(1);
}

const sentences = JSON.parse(await readFile('apps/web/src/audio/fixed-sentences.json', 'utf8'));
const store = {
  async exists(path) {
    return access(path).then(
      () => true,
      () => false,
    );
  },
  async write(path, bytes) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  },
};

const result = await generateFixedAudio(sentences, {
  provider: azureTtsProvider({ apiKey, region }),
  store,
  publicDir: 'apps/web/public',
  costPerMillionChars: Number(process.env.TTS_COST_PER_MILLION_CHARS) || 0,
  onCost: (event) => console.info(JSON.stringify({ event: 'tts_cost', ...event })),
});
console.info(`Interface audio: ${result.generated} generated, ${result.skipped} already there.`);
