import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { healthyRun } from './fixtures';
import { listRuns, loadRun, newRunId, saveRun } from './store';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'bb21-runs-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('run store', () => {
  it('round-trips a run by id and by path', async () => {
    const run = healthyRun({ id: 'round-trip' });
    const path = await saveRun(run, dir);
    expect(await loadRun('round-trip', dir)).toEqual(run);
    expect(await loadRun(path, dir)).toEqual(run);
  });

  it('refuses to overwrite a run', async () => {
    await saveRun(healthyRun({ id: 'once' }), dir);
    await expect(saveRun(healthyRun({ id: 'once' }), dir)).rejects.toThrow();
  });

  it('lists runs oldest first and returns nothing for a missing folder', async () => {
    await saveRun(healthyRun({ id: 'b' }), dir);
    await saveRun(healthyRun({ id: 'a' }), dir);
    expect(await listRuns(dir)).toEqual(['a', 'b']);
    expect(await listRuns(join(dir, 'missing'))).toEqual([]);
  });

  it('builds sortable ids with an optional label', () => {
    const at = new Date('2026-10-17T10:05:09.123Z');
    expect(newRunId(at)).toBe('2026-10-17T10-05-09Z');
    expect(newRunId(at, 'Gemini Flash 2.5')).toBe('2026-10-17T10-05-09Z-gemini-flash-2.5');
  });
});
