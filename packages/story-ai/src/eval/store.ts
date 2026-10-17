/**
 * Saves and loads runs as JSON files (BB-21). By default they go to `tmp/eval-runs` at the repo
 * root, which git ignores, so a run never lands in a commit by accident.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvalRun } from './run';

export const RUNS_DIR = fileURLToPath(new URL('../../../../tmp/eval-runs/', import.meta.url));

/** A sortable id such as `2026-10-17T10-00-00Z-flash`. */
export function newRunId(startedAt: Date, label?: string): string {
  const stamp = startedAt
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/:/g, '-');
  const slug = (label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `${stamp}-${slug}` : stamp;
}

/** Writes a new run file. Refuses to overwrite one that exists. */
export async function saveRun(run: EvalRun, dir = RUNS_DIR): Promise<string> {
  const valid = EvalRun.parse(run);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${valid.id}.json`);
  await writeFile(path, `${JSON.stringify(valid, null, 2)}\n`, { flag: 'wx' });
  return path;
}

export class RunNotFound extends Error {
  constructor(path: string) {
    super(`No run file at ${path}.`);
    this.name = 'RunNotFound';
  }
}

/** Loads a run by id from `dir`, or by a path ending in `.json`. */
export async function loadRun(ref: string, dir = RUNS_DIR): Promise<EvalRun> {
  const path = ref.endsWith('.json') ? ref : join(dir, `${ref}.json`);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new RunNotFound(path);
  }
  return EvalRun.parse(JSON.parse(raw));
}

/** Run ids in `dir`, oldest first. */
export async function listRuns(dir = RUNS_DIR): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort();
  } catch {
    return [];
  }
}
