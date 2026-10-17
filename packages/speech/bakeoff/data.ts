/**
 * Reads and writes the bake-off data folder (BAKEOFF_DATA_DIR). The folder holds children's
 * recordings and transcripts, so it must never be inside a repository (PROTOCOL.md).
 *
 * Layout:
 *   manifest.csv                     one row per recording, group fields only
 *   audio/<id>.wav                   16 kHz mono 16-bit PCM
 *   transcripts/<id>.tsv             human transcript (ANNOTATION.md)
 *   transcripts-second/<id>.tsv      second annotator, for agreement
 *   labels/<id>.txt                  Audacity label export, for timestamps
 *   results/<provider>/<mode>-<transport>/<id>.json   provider output
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normaliseWords } from './text.ts';
import { TRUTH_OUTCOMES } from './types.ts';
import type { Mode, Passage, Recording, StoredResult, TruthOutcome, TruthRow } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

export const AGE_BANDS = ['6-8', '9-11', '12-14', '15-17'];
export const FIRST_LANGUAGES = [
  'tagalog',
  'cebuano',
  'ilocano',
  'hiligaynon',
  'bikol',
  'waray',
  'kapampangan',
  'other-ph',
  'english',
  'other',
];
export const DEVICES = ['laptop', 'phone', 'tablet'];
export const NOISE = ['quiet', 'noisy'];

export class DataError extends Error {}

/** True when the path is inside a git checkout or a pnpm workspace. Symlinks are followed. */
export function isInsideRepository(path: string): boolean {
  let dir = existsSync(path) ? realpathSync(path) : resolve(path);
  for (;;) {
    if (existsSync(join(dir, '.git')) || existsSync(join(dir, 'pnpm-workspace.yaml'))) return true;
    const parent = dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

/** Folders that sync to a cloud service: OneDrive, Dropbox, Google Drive, iCloud, Box. */
const SYNCED_FOLDER =
  /onedrive|dropbox|google ?drive|icloud|mobile documents|[\\/]library[\\/]cloudstorage[\\/]|[\\/]box( sync)?[\\/]/i;

/** Resolve BAKEOFF_DATA_DIR and refuse anything unsafe. */
export function dataDir(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.BAKEOFF_DATA_DIR;
  if (!raw) throw new DataError('Set BAKEOFF_DATA_DIR to the encrypted data folder.');
  if (!existsSync(raw)) throw new DataError('BAKEOFF_DATA_DIR does not exist.');
  // Follow symlinks so a link that points into a repository or a synced folder is caught.
  const dir = realpathSync(raw);
  if (isInsideRepository(dir)) {
    throw new DataError('BAKEOFF_DATA_DIR is inside a repository. Move the data out of it.');
  }
  if (SYNCED_FOLDER.test(dir) && env.BAKEOFF_ALLOW_SYNCED !== '1') {
    throw new DataError(
      'BAKEOFF_DATA_DIR is in a synced folder. Use an encrypted container, then set BAKEOFF_ALLOW_SYNCED=1.',
    );
  }
  return dir;
}

export function loadPassages(file = join(HERE, 'passages.json')): Map<string, Passage> {
  const list = JSON.parse(readFileSync(file, 'utf8')) as Passage[];
  return new Map(list.map((p) => [p.id, p]));
}

function oneOf(value: string, allowed: string[], field: string, line: number): string {
  if (!allowed.includes(value)) {
    throw new DataError(`manifest.csv line ${line}: ${field} must be one of ${allowed.join(', ')}`);
  }
  return value;
}

export function parseManifest(
  csv: string,
  passages: Map<string, Passage>,
  providerNames: string[],
): Recording[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines[0]?.split(',').map((h) => h.trim());
  const expected = [
    'recording_id',
    'reader_code',
    'passage_id',
    'age_band',
    'first_language',
    'device',
    'noise',
    'vendors',
  ];
  if (!header || expected.some((h, i) => header[i] !== h)) {
    throw new DataError(`manifest.csv header must be: ${expected.join(',')}`);
  }
  const seen = new Set<string>();
  return lines.slice(1).map((line, k) => {
    const n = k + 2;
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== expected.length)
      throw new DataError(`manifest.csv line ${n}: wrong cell count`);
    const [recordingId, readerCode, passageId, ageBand, firstLanguage, device, noise, vendors] =
      cells as [string, string, string, string, string, string, string, string];
    if (!/^rec-\d{4}$/.test(recordingId))
      throw new DataError(`manifest.csv line ${n}: bad recording_id`);
    if (seen.has(recordingId))
      throw new DataError(`manifest.csv line ${n}: duplicate recording_id`);
    seen.add(recordingId);
    if (!/^R\d{2,3}$/.test(readerCode))
      throw new DataError(`manifest.csv line ${n}: bad reader_code`);
    if (!passages.has(passageId)) throw new DataError(`manifest.csv line ${n}: unknown passage_id`);
    const vendorList = vendors
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean);
    for (const v of vendorList) oneOf(v, providerNames, 'vendors', n);
    return {
      recordingId,
      readerCode,
      passageId,
      ageBand: oneOf(ageBand, AGE_BANDS, 'age_band', n),
      firstLanguage: oneOf(firstLanguage, FIRST_LANGUAGES, 'first_language', n),
      device: oneOf(device, DEVICES, 'device', n),
      noise: oneOf(noise, NOISE, 'noise', n),
      vendors: vendorList,
    };
  });
}

const TSV_HEADER = ['index', 'expected', 'outcome', 'said', 'start', 'end'];

function num(cell: string | undefined): number | null {
  if (cell === undefined || cell.trim() === '') return null;
  const v = Number(cell);
  if (!Number.isFinite(v) || v < 0) throw new DataError('bad time value');
  return v;
}

/** Parse and check a transcript against its passage. Errors name the row, never its content. */
export function parseTranscript(tsv: string, passageWords: string[], name: string): TruthRow[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines[0]?.split('\t').map((h) => h.trim());
  if (!header || TSV_HEADER.some((h, i) => header[i] !== h)) {
    throw new DataError(`${name}: header must be ${TSV_HEADER.join(' ')}`);
  }
  let nextIndex = 0;
  const rows = lines.slice(1).map((line, k) => {
    const where = `${name} row ${k + 2}`;
    const c = line.split('\t');
    const outcome = (c[2] ?? '').trim() as TruthOutcome;
    if (!TRUTH_OUTCOMES.includes(outcome)) throw new DataError(`${where}: unknown outcome`);
    const indexCell = (c[0] ?? '').trim();
    const said = normaliseWords(c[3] ?? '');
    let start: number | null;
    let end: number | null;
    try {
      start = num(c[4]);
      end = num(c[5]);
    } catch {
      throw new DataError(`${where}: bad start or end`);
    }
    if ((start === null) !== (end === null) || (start !== null && end !== null && end < start)) {
      throw new DataError(`${where}: start and end must both be set, with end after start`);
    }
    if (outcome === 'insertion') {
      if (indexCell !== '') throw new DataError(`${where}: insertion rows have no index`);
      if (said.length === 0) throw new DataError(`${where}: insertion needs said`);
      return { index: null, expected: null, outcome, said, start, end };
    }
    const index = Number(indexCell);
    if (indexCell === '' || index !== nextIndex) {
      throw new DataError(`${where}: expected index ${nextIndex}`);
    }
    const expected = normaliseWords(c[1] ?? '').join(' ');
    if (expected !== passageWords[index]) {
      throw new DataError(`${where}: expected word does not match the passage`);
    }
    nextIndex++;
    if (outcome === 'omission' && said.length > 0)
      throw new DataError(`${where}: omission has said`);
    if (outcome !== 'omission' && outcome !== 'unclear' && said.length === 0) {
      throw new DataError(`${where}: said is empty`);
    }
    return { index, expected, outcome, said, start, end };
  });
  if (nextIndex !== passageWords.length) {
    throw new DataError(
      `${name}: has ${nextIndex} passage words, passage has ${passageWords.length}`,
    );
  }
  return rows;
}

/** A transcript pre-filled as all correct, for annotators to edit. */
export function transcriptTemplate(passageWords: string[]): string {
  const rows = passageWords.map((w, i) => [String(i), w, 'correct', w, '', ''].join('\t'));
  return [TSV_HEADER.join('\t'), ...rows].join('\n') + '\n';
}

/** Copy Audacity label times (start, end, label per line) onto rows that have something said. */
export function mergeLabels(tsv: string, labels: string, name: string): string {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const spans = labels
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.startsWith('\\'))
    .map((l) => l.split('\t'))
    .map(([s, e]) => [Number(s), Number(e)] as const);
  const targets = lines
    .slice(1)
    .map((l, i) => ({ i: i + 1, cells: l.split('\t') }))
    .filter(({ cells }) => normaliseWords(cells[3] ?? '').length > 0);
  if (targets.length !== spans.length) {
    throw new DataError(`${name}: ${spans.length} labels for ${targets.length} rows with said`);
  }
  targets.forEach(({ i, cells }, k) => {
    const [s, e] = spans[k]!;
    while (cells.length < 6) cells.push('');
    cells[4] = s.toFixed(2);
    cells[5] = e.toFixed(2);
    lines[i] = cells.join('\t');
  });
  return lines.join('\n') + '\n';
}

export interface Dataset {
  dir: string;
  passages: Map<string, Passage>;
  recordings: Recording[];
  truth: Map<string, TruthRow[]>;
  second: Map<string, TruthRow[]>;
}

export function passageWords(p: Passage): string[] {
  return normaliseWords(p.text);
}

export function loadDataset(dir: string, providerNames: string[]): Dataset {
  const passages = loadPassages();
  const manifestPath = join(dir, 'manifest.csv');
  if (!existsSync(manifestPath))
    throw new DataError('manifest.csv is missing from the data folder.');
  const recordings = parseManifest(readFileSync(manifestPath, 'utf8'), passages, providerNames);
  const readFolder = (sub: string) => {
    const out = new Map<string, TruthRow[]>();
    for (const r of recordings) {
      const file = join(dir, sub, `${r.recordingId}.tsv`);
      if (!existsSync(file)) continue;
      const words = passageWords(passages.get(r.passageId)!);
      out.set(
        r.recordingId,
        parseTranscript(readFileSync(file, 'utf8'), words, `${sub}/${r.recordingId}`),
      );
    }
    return out;
  };
  return {
    dir,
    passages,
    recordings,
    truth: readFolder('transcripts'),
    second: readFolder('transcripts-second'),
  };
}

export function audioPath(dir: string, recordingId: string): string {
  return join(dir, 'audio', `${recordingId}.wav`);
}

function resultFolder(dir: string, provider: string, mode: Mode, transport: string): string {
  return join(dir, 'results', provider, `${mode}-${transport}`);
}

export function writeResult(dir: string, r: StoredResult): void {
  const folder = resultFolder(dir, r.provider, r.mode, r.transport);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${r.recordingId}.json`), JSON.stringify(r));
}

/**
 * True when a call needs no rerun: it succeeded, or the audio is too long for that provider.
 * Failed calls (an expired token, a timeout) are retried on the next run.
 */
export function hasSettledResult(
  dir: string,
  provider: string,
  mode: Mode,
  transport: string,
  id: string,
): boolean {
  const file = join(resultFolder(dir, provider, mode, transport), `${id}.json`);
  if (!existsSync(file)) return false;
  const r = JSON.parse(readFileSync(file, 'utf8')) as StoredResult;
  return r.ok || r.error === 'too_long';
}

export function readAllResults(dir: string): StoredResult[] {
  const root = join(dir, 'results');
  if (!existsSync(root)) return [];
  const out: StoredResult[] = [];
  for (const provider of readdirSync(root)) {
    for (const run of readdirSync(join(root, provider))) {
      for (const file of readdirSync(join(root, provider, run))) {
        if (file.endsWith('.json')) {
          out.push(
            JSON.parse(readFileSync(join(root, provider, run, file), 'utf8')) as StoredResult,
          );
        }
      }
    }
  }
  return out;
}
