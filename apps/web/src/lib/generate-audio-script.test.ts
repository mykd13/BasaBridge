import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../..');

describe('scripts/generate-interface-audio.mjs', () => {
  it('starts and exits cleanly on an empty sentence list without a key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bb57-'));
    const list = join(dir, 'list.json');
    writeFileSync(list, JSON.stringify({ en: [], fil: [] }));
    const run = spawnSync(process.execPath, ['scripts/generate-interface-audio.mjs'], {
      cwd: root,
      env: { ...process.env, FIXED_SENTENCES_PATH: list, TTS_API_KEY: '', TTS_REGION: '' },
      encoding: 'utf8',
    });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('nothing to do');
  });

  it('asks for the key when there are sentences to generate', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bb57-'));
    const list = join(dir, 'list.json');
    writeFileSync(list, JSON.stringify({ en: ['Tap start'], fil: [] }));
    const run = spawnSync(process.execPath, ['scripts/generate-interface-audio.mjs'], {
      cwd: root,
      env: { ...process.env, FIXED_SENTENCES_PATH: list, TTS_API_KEY: '', TTS_REGION: '' },
      encoding: 'utf8',
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('TTS_API_KEY');
  });
});
