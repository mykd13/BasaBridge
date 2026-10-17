/**
 * Generate audio for fixed interface sentences (BB-57). Run with: pnpm audio:generate [--force]
 * Reads apps/web/src/audio/fixed-sentences.json and writes apps/web/public/audio/<lang>/<hash>.mp3.
 * The generated mp3 files are committed as static assets. Nothing runs this during `pnpm build`,
 * so the build never needs the key. Run it by hand when the sentence list or the voice changes.
 * Existing files are skipped, so use --force after a voice change.
 * An empty list needs no key, so CI can run this to prove the script still starts.
 * Until the i18n catalog exists (BB-58) the JSON list is the source.
 * Needs TTS_API_KEY and TTS_REGION (see example.env). Node 24 runs the TypeScript imports directly.
 */
/* global process, console */
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { azureTtsProvider } from '../packages/speech/src/tts.ts';
import { generateFixedAudio } from '../packages/speech/src/fixed.ts';

const listPath = process.env.FIXED_SENTENCES_PATH ?? 'apps/web/src/audio/fixed-sentences.json';
const publicDir = process.env.AUDIO_PUBLIC_DIR ?? 'apps/web/public';
const sentences = JSON.parse(await readFile(listPath, 'utf8'));

if (sentences.en.length === 0 && sentences.fil.length === 0) {
  console.info('Interface audio: the sentence list is empty, nothing to do.');
  process.exit(0);
}

const apiKey = process.env.TTS_API_KEY;
const region = process.env.TTS_REGION;
if (!apiKey || !region) {
  console.error('Set TTS_API_KEY and TTS_REGION first (see example.env).');
  process.exit(1);
}

const store = {
  async exists(path) {
    return access(path).then(
      () => true,
      () => false,
    );
  },
  // Write to a temporary name and rename, so a crash never leaves a half-written mp3.
  async write(path, bytes) {
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.tmp`;
    await writeFile(temp, bytes);
    await rename(temp, path);
  },
};

const result = await generateFixedAudio(sentences, {
  provider: azureTtsProvider({ apiKey, region }),
  store,
  publicDir,
  costPerMillionChars: Number(process.env.TTS_COST_PER_MILLION_CHARS) || 0,
  force: process.argv.includes('--force'),
  onCost: (event) => console.info(JSON.stringify({ event: 'tts_cost', ...event })),
});
console.info(`Interface audio: ${result.generated} generated, ${result.skipped} already there.`);
