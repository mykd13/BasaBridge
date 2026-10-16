/**
 * Bake-off command line. Run through pnpm from the repo root:
 *
 *   pnpm --filter @basabridge/speech bakeoff check
 *   pnpm --filter @basabridge/speech bakeoff:templates
 *   pnpm --filter @basabridge/speech bakeoff:labels rec-0042
 *   pnpm --filter @basabridge/speech bakeoff run --provider deepgram --mode both
 *   pnpm --filter @basabridge/speech bakeoff report
 *   pnpm --filter @basabridge/speech bakeoff selftest
 *
 * See README.md. Only recording IDs, group fields, statuses and timings are ever printed.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DataError,
  audioPath,
  dataDir,
  hasResult,
  loadDataset,
  loadPassages,
  mergeLabels,
  parseManifest,
  passageWords,
  readAllResults,
  transcriptTemplate,
  writeResult,
} from './data.ts';
import type { Dataset } from './data.ts';
import { ProviderError, log } from './log.ts';
import { COMPANIES, PROVIDER_NAMES, companyOf, createProvider } from './providers/index.ts';
import { buildReport } from './report.ts';
import type { VendorFacts } from './report.ts';
import type { Mode, StoredResult } from './types.ts';
import { readWav, writeWav } from './wav.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const TIMEOUT_MS = 120_000;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Local date, so the report matches the day the vendor terms were checked. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function check(dir: string) {
  const ds = loadDataset(dir, COMPANIES);
  const missingAudio = ds.recordings.filter((r) => !existsSync(audioPath(dir, r.recordingId)));
  const missingTruth = ds.recordings.filter((r) => !ds.truth.has(r.recordingId));
  const timed = [...ds.truth.values()].filter((rows) => rows.some((r) => r.start !== null));
  log('recordings', { count: ds.recordings.length });
  log('readers', { count: new Set(ds.recordings.map((r) => r.readerCode)).size });
  log('missing_audio', { count: missingAudio.length });
  log('missing_transcript', { count: missingTruth.length });
  log('with_timestamps', { count: timed.length });
  log('second_transcripts', { count: ds.second.size });
  for (const r of missingAudio) log('missing_audio', { recordingId: r.recordingId });
  for (const r of missingTruth) log('missing_transcript', { recordingId: r.recordingId });
}

function templates(dir: string) {
  const passages = loadPassages();
  const recordings = parseManifest(
    readFileSync(join(dir, 'manifest.csv'), 'utf8'),
    passages,
    COMPANIES,
  );
  mkdirSync(join(dir, 'transcripts'), { recursive: true });
  let written = 0;
  for (const r of recordings) {
    const file = join(dir, 'transcripts', `${r.recordingId}.tsv`);
    if (existsSync(file)) continue;
    writeFileSync(file, transcriptTemplate(passageWords(passages.get(r.passageId)!)));
    written++;
  }
  log('templates_written', { count: written });
}

function labels(dir: string, id: string | undefined) {
  if (!id || !/^rec-\d{4}$/.test(id))
    throw new DataError('Give a recording ID, for example rec-0042.');
  const tsvPath = join(dir, 'transcripts', `${id}.tsv`);
  const labelPath = join(dir, 'labels', `${id}.txt`);
  if (!existsSync(tsvPath) || !existsSync(labelPath))
    throw new DataError(`Transcript or labels missing for ${id}.`);
  writeFileSync(
    tsvPath,
    mergeLabels(readFileSync(tsvPath, 'utf8'), readFileSync(labelPath, 'utf8'), id),
  );
  log('labels_merged', { recordingId: id });
}

async function runProviders(ds: Dataset, args: string[], env: NodeJS.ProcessEnv) {
  const names = (flag(args, 'provider') ?? '').split(',').filter(Boolean);
  if (names.length === 0)
    throw new DataError(`Give --provider, one or more of ${PROVIDER_NAMES.join(', ')}.`);
  const modeArg = flag(args, 'mode') ?? 'both';
  const modes: Mode[] = modeArg === 'both' ? ['plain', 'biased'] : [modeArg as Mode];
  const transportArg = flag(args, 'transport') ?? 'batch';
  const transports = transportArg === 'both' ? ['batch', 'stream'] : [transportArg];
  const limit = Number(flag(args, 'limit') ?? Infinity);
  const force = args.includes('--force');

  for (const name of names) {
    const provider = createProvider(name, env);
    let done = 0;
    for (const rec of ds.recordings) {
      if (done >= limit) break;
      if (name !== 'oracle' && !rec.vendors.includes(companyOf(name))) {
        log('skip_no_consent', { recordingId: rec.recordingId, provider: name });
        continue;
      }
      const file = audioPath(ds.dir, rec.recordingId);
      if (!existsSync(file)) continue;
      const bytes = new Uint8Array(readFileSync(file));
      const wav = readWav(bytes);
      if (wav.channels !== 1 || wav.sampleRate !== 16000) {
        log('skip_bad_audio', { recordingId: rec.recordingId });
        continue;
      }
      const passage = ds.passages.get(rec.passageId)!;
      const selfTestWords =
        name === 'oracle'
          ? (ds.truth.get(rec.recordingId) ?? []).flatMap((r) => r.said)
          : undefined;
      for (const mode of modes) {
        if (!provider.modes.includes(mode)) continue;
        for (const transport of transports) {
          if (transport === 'stream' && !provider.runStream) continue;
          const t = transport as 'batch' | 'stream';
          if (!force && hasResult(ds.dir, name, mode, t, rec.recordingId)) continue;
          if (t === 'batch' && provider.maxSeconds && wav.seconds > provider.maxSeconds) {
            writeResult(ds.dir, {
              words: [],
              provider: name,
              mode,
              transport: t,
              recordingId: rec.recordingId,
              latencyMs: 0,
              audioSeconds: wav.seconds,
              ok: false,
              error: 'too_long',
            });
            log('call', { recordingId: rec.recordingId, provider: name, mode, status: 'too_long' });
            continue;
          }
          const options = {
            referenceText: passage.text,
            bias: mode === 'biased',
            sampleRate: wav.sampleRate,
            signal: AbortSignal.timeout(TIMEOUT_MS),
            ...(selfTestWords ? { selfTestWords } : {}),
          };
          const started = performance.now();
          let stored: StoredResult;
          try {
            const res =
              t === 'stream'
                ? await provider.runStream!(wav, options)
                : await provider.run(new Blob([bytes], { type: 'audio/wav' }), options);
            stored = {
              ...res,
              provider: name,
              mode,
              transport: t,
              recordingId: rec.recordingId,
              latencyMs: performance.now() - started,
              audioSeconds: wav.seconds,
              ok: true,
            };
          } catch (err) {
            const status =
              err instanceof ProviderError
                ? err.status
                : err instanceof Error && err.name === 'TimeoutError'
                  ? 'timeout'
                  : 'error';
            if (process.env.BAKEOFF_DEBUG === '1') console.error(err);
            stored = {
              words: [],
              provider: name,
              mode,
              transport: t,
              recordingId: rec.recordingId,
              latencyMs: performance.now() - started,
              audioSeconds: wav.seconds,
              ok: false,
              error: status,
            };
          }
          writeResult(ds.dir, stored);
          log('call', {
            recordingId: rec.recordingId,
            provider: name,
            mode,
            transport: t,
            status: stored.ok ? 'ok' : stored.error,
            ms: Math.round(stored.latencyMs),
          });
        }
      }
      done++;
    }
  }
}

function loadVendors(): VendorFacts[] {
  const file = join(HERE, 'vendors.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as VendorFacts[]) : [];
}

function report(ds: Dataset, args: string[]) {
  const out = flag(args, 'out') ?? join(HERE, 'REPORT.md');
  const md = buildReport(ds, readAllResults(ds.dir), loadVendors(), {
    generatedOn: today(),
    includeOracle: args.includes('--include-oracle'),
  });
  writeFileSync(out, md);
  log('report_written', { count: md.length });
}

/** Builds a throwaway data folder in the OS temp directory and runs the whole pipeline offline. */
async function selftest() {
  const dir = mkdtempSync(join(tmpdir(), 'bakeoff-selftest-'));
  const passages = loadPassages();
  const ids = [...passages.keys()];
  const bands = ['6-8', '9-11', '12-14', '15-17'];
  const rows = ['recording_id,reader_code,passage_id,age_band,first_language,device,noise,vendors'];
  mkdirSync(join(dir, 'audio'));
  mkdirSync(join(dir, 'transcripts'));
  mkdirSync(join(dir, 'transcripts-second'));
  for (let i = 0; i < 24; i++) {
    const id = `rec-${String(i + 1).padStart(4, '0')}`;
    const reader = `R${String((i % 8) + 1).padStart(2, '0')}`;
    const passageId = ids[i % ids.length]!;
    rows.push(
      [
        id,
        reader,
        passageId,
        bands[(i % 8) >> 1]!,
        i % 3 ? 'cebuano' : 'tagalog',
        i % 2 ? 'phone' : 'laptop',
        i % 3 ? 'quiet' : 'noisy',
        '',
      ].join(','),
    );
    const words = passageWords(passages.get(passageId)!);
    // One second of silence per four words; the oracle never listens to it.
    writeFileSync(
      join(dir, 'audio', `${id}.wav`),
      writeWav(new Uint8Array(words.length * 8000), 16000),
    );
    const tsv = transcriptTemplate(words)
      .split('\n')
      .map((line, k) => {
        if (k === 0 || line === '') return line;
        const c = line.split('\t');
        const w = k - 1;
        if (w % 11 === 5) return [c[0], c[1], 'substitution', `${c[1]}s`, '', ''].join('\t');
        if (w % 19 === 7) return [c[0], c[1], 'omission', '', '', ''].join('\t');
        const start = (0.5 + w * 0.4).toFixed(2);
        const end = (0.5 + w * 0.4 + 0.32).toFixed(2);
        return [c[0], c[1], c[2], c[3], start, end].join('\t');
      })
      .join('\n');
    writeFileSync(join(dir, 'transcripts', `${id}.tsv`), tsv);
    if (i % 6 === 0) writeFileSync(join(dir, 'transcripts-second', `${id}.tsv`), tsv);
  }
  writeFileSync(join(dir, 'manifest.csv'), rows.join('\n') + '\n');
  const env = { ...process.env, BAKEOFF_DATA_DIR: dir };
  const ds = loadDataset(dataDir(env), COMPANIES);
  await runProviders(ds, ['--provider', 'oracle', '--mode', 'both'], env);
  const md = buildReport(ds, readAllResults(dir), loadVendors(), {
    generatedOn: today(),
    includeOracle: true,
  });
  writeFileSync(join(dir, 'REPORT.md'), md);
  console.log(`selftest report: ${join(dir, 'REPORT.md')}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'selftest') return selftest();
  const dir = dataDir();
  switch (command) {
    case 'check':
      return check(dir);
    case 'templates':
      return templates(dir);
    case 'labels':
      return labels(dir, args[0]);
    case 'run':
      return runProviders(loadDataset(dir, COMPANIES), args, process.env);
    case 'report':
      return report(loadDataset(dir, COMPANIES), args);
    default:
      throw new DataError('Commands: check, templates, labels <id>, run, report, selftest.');
  }
}

main().catch((err: unknown) => {
  if (err instanceof DataError || err instanceof ProviderError) {
    console.error(err.message);
  } else {
    console.error(
      err instanceof Error ? err.name : 'error',
      process.env.BAKEOFF_DEBUG === '1' ? err : '',
    );
  }
  process.exitCode = 1;
});
