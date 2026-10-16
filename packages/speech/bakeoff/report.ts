/**
 * Turns stored provider results into REPORT.md. Only aggregated numbers leave this file:
 * no audio, no transcript text, no reader codes, and no group smaller than the minimum cell.
 */
import { tierFor } from '@basabridge/levels';
import { passageWords } from './data.ts';
import type { Dataset } from './data.ts';
import { FLAG_THRESHOLDS, referenceVerdicts, scoreRecording } from './metrics.ts';
import type { ErrorCounts, RecordingScore } from './metrics.ts';
import { auroc, clusterBootstrapRatio, cohenKappa, mean, percentile } from './stats.ts';
import { GROUP_FIELDS } from './types.ts';
import type { GroupField, Recording, StoredResult } from './types.ts';

/** Groups smaller than this are not shown (PROTOCOL.md). */
export const MIN_RECORDINGS = 5;
export const MIN_READERS = 3;

export interface VendorFacts {
  provider: string;
  vendor: string;
  product: string;
  checkedOn: string;
  pricePer1000MinBatchUsd: number | null;
  pricePer1000MinStreamUsd: number | null;
  streaming: string;
  wordTimestamps: string;
  wordConfidence: string;
  biasing: string;
  region: string;
  retention: string;
  zeroRetention: string;
  childTerms: string;
  sources: string[];
}

interface Scored {
  recording: Recording;
  result: StoredResult;
  score: RecordingScore;
}

const runKey = (r: StoredResult) => `${r.provider} ${r.mode} ${r.transport}`;

export function groupValue(rec: Recording, field: GroupField, dataset: Dataset): string {
  if (field === 'tier') {
    const t = tierFor(dataset.passages.get(rec.passageId)!.level);
    return `levels ${t.from}-${t.to}`;
  }
  return rec[field];
}

const pct = (x: number | null) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const ci = (x: [number, number] | null) =>
  x === null ? '' : ` (${(x[0] * 100).toFixed(1)} to ${(x[1] * 100).toFixed(1)})`;
const ms = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x)} ms`);
const sec = (x: number | null) => (x === null ? 'n/a' : `${(x / 1000).toFixed(2)} s`);
const dec = (x: number | null, d = 2) => (x === null ? 'n/a' : x.toFixed(d));
const ratio = (num: number, den: number) => (den === 0 ? null : num / den);

function byReader(items: Scored[], pick: (s: RecordingScore) => [number, number]) {
  const m = new Map<string, [number, number]>();
  for (const it of items) {
    const [a, b] = pick(it.score);
    const cur = m.get(it.recording.readerCode) ?? [0, 0];
    m.set(it.recording.readerCode, [cur[0] + a, cur[1] + b]);
  }
  return [...m.values()];
}

function sumCounts(list: ErrorCounts[]): ErrorCounts {
  return list.reduce(
    (a, c) => ({
      falseErrors: a.falseErrors + c.falseErrors,
      readWords: a.readWords + c.readWords,
      missedErrors: a.missedErrors + c.missedErrors,
      miscueWords: a.miscueWords + c.miscueWords,
    }),
    { falseErrors: 0, readWords: 0, missedErrors: 0, miscueWords: 0 },
  );
}

function readers(items: Scored[]): number {
  return new Set(items.map((i) => i.recording.readerCode)).size;
}

function showable(items: Scored[]): boolean {
  return items.length >= MIN_RECORDINGS && readers(items) >= MIN_READERS;
}

export interface ReportOptions {
  generatedOn: string;
  /** Include the offline oracle provider. Only for testing the harness. */
  includeOracle?: boolean;
}

export function buildReport(
  dataset: Dataset,
  results: StoredResult[],
  vendors: VendorFacts[],
  opts: ReportOptions,
): string {
  const recById = new Map(dataset.recordings.map((r) => [r.recordingId, r]));
  const runs = new Map<string, Scored[]>();
  const failures = new Map<string, number>();
  for (const result of results) {
    if (result.provider === 'oracle' && !opts.includeOracle) continue;
    const key = runKey(result);
    const recording = recById.get(result.recordingId);
    const rows = dataset.truth.get(result.recordingId);
    if (!recording || !rows) continue;
    if (!result.ok) {
      failures.set(key, (failures.get(key) ?? 0) + 1);
      if (!runs.has(key)) runs.set(key, []);
      continue;
    }
    const words = passageWords(dataset.passages.get(recording.passageId)!);
    const score = scoreRecording(words, rows, result.words, result.assessment);
    const list = runs.get(key) ?? [];
    list.push({ recording, result, score });
    runs.set(key, list);
  }

  const keys = [...runs.keys()].sort();
  // Compare like with like: the main table uses recordings every run has a result for.
  const common = keys.reduce<Set<string> | null>((acc, k) => {
    const ids = new Set(runs.get(k)!.map((s) => s.recording.recordingId));
    return acc === null ? ids : new Set([...acc].filter((id) => ids.has(id)));
  }, null);
  const commonOnly = (k: string) =>
    runs.get(k)!.filter((s) => common !== null && common.has(s.recording.recordingId));

  const out: string[] = [];
  const transcribed = dataset.recordings.filter((r) => dataset.truth.has(r.recordingId));
  const wordCount = transcribed.reduce(
    (n, r) => n + passageWords(dataset.passages.get(r.passageId)!).length,
    0,
  );

  out.push('# Speech bake-off report');
  out.push('');
  out.push(
    `Generated ${opts.generatedOn} by \`pnpm --filter @basabridge/speech bakeoff report\`. Aggregated numbers only. Groups with fewer than ${MIN_RECORDINGS} recordings or ${MIN_READERS} readers are hidden.`,
  );
  out.push('');
  out.push('## Test set');
  out.push('');
  out.push(
    `${transcribed.length} transcribed recordings from ${new Set(transcribed.map((r) => r.readerCode)).size} readers, ${wordCount} passage words.`,
  );
  out.push('');
  out.push('| Group | Value | Recordings |');
  out.push('| --- | --- | --- |');
  for (const field of GROUP_FIELDS) {
    const counts = new Map<string, Recording[]>();
    for (const r of transcribed) {
      const v = groupValue(r, field, dataset);
      counts.set(v, [...(counts.get(v) ?? []), r]);
    }
    for (const [v, list] of [...counts.entries()].sort()) {
      const n = list.length < MIN_RECORDINGS ? `fewer than ${MIN_RECORDINGS}` : String(list.length);
      out.push(`| ${field} | ${v} | ${n} |`);
    }
  }
  out.push('');

  out.push('## Annotator agreement');
  out.push('');
  const a: boolean[] = [];
  const b: boolean[] = [];
  for (const [id, second] of dataset.second) {
    const first = dataset.truth.get(id);
    if (!first) continue;
    const v1 = referenceVerdicts(first);
    const v2 = referenceVerdicts(second);
    v1.forEach((x, i) => {
      const y = v2[i];
      if (!y || x.verdict === 'unclear' || y.verdict === 'unclear') return;
      a.push(x.verdict === 'miscue');
      b.push(y.verdict === 'miscue');
    });
  }
  if (a.length === 0) {
    out.push('No recordings have a second transcript yet.');
  } else {
    const agree = a.filter((x, i) => x === b[i]).length / a.length;
    out.push(
      `${dataset.second.size} recordings transcribed twice. Read or misread agreed on ${pct(agree)} of ${a.length} words. Cohen's kappa ${dec(cohenKappa(a, b))}.`,
    );
  }
  out.push('');

  out.push('## Results');
  out.push('');
  out.push(
    `Main table: ${common?.size ?? 0} recordings that every run below has a result for. Word error rate is against what the reader actually said. False error rate is the share of words read correctly that the provider would mark wrong, the number that hurts children most. Missed error rate is the share of real misreadings the provider would accept. Ranges are 95% intervals from resampling readers.`,
  );
  out.push('');
  out.push(
    '| Run | Failed calls | Word error rate | False error rate | Missed error rate | Start time error (mean, p90) | Confidence AUROC | Mean confidence right / wrong | Latency p50 / p95 | Real-time factor p50 |',
  );
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const k of keys) {
    const items = commonOnly(k);
    const all = runs.get(k)!;
    const edits = items.reduce((n, s) => n + s.score.wordEdits, 0);
    const refLen = items.reduce((n, s) => n + s.score.wordRefLength, 0);
    const c = sumCounts(items.map((s) => s.score.errors));
    const werCi = clusterBootstrapRatio(byReader(items, (s) => [s.wordEdits, s.wordRefLength]));
    const ferCi = clusterBootstrapRatio(
      byReader(items, (s) => [s.errors.falseErrors, s.errors.readWords]),
    );
    const starts = items.flatMap((s) => s.score.startErrorsMs);
    const conf = items.flatMap((s) => s.score.confidence);
    const wrong = items.flatMap((s) => s.score.wrong);
    const lat = all.map((s) =>
      s.result.transport === 'stream'
        ? (s.result.finalAfterEndMs ?? s.result.latencyMs)
        : s.result.latencyMs,
    );
    const rtf = all
      .filter((s) => s.result.audioSeconds > 0)
      .map((s) => s.result.latencyMs / 1000 / s.result.audioSeconds);
    out.push(
      `| ${k} | ${failures.get(k) ?? 0} of ${all.length + (failures.get(k) ?? 0)} | ${pct(ratio(edits, refLen))}${ci(werCi)} | ${pct(ratio(c.falseErrors, c.readWords))}${ci(ferCi)} | ${pct(ratio(c.missedErrors, c.miscueWords))} | ${ms(mean(starts))}, ${ms(percentile(starts, 90))} | ${dec(
        auroc(
          conf.map((x) => 1 - x),
          wrong,
        ),
      )} | ${dec(mean(conf.filter((_, i) => !wrong[i])))} / ${dec(mean(conf.filter((_, i) => wrong[i])))} | ${sec(percentile(lat, 50))} / ${sec(percentile(lat, 95))} | ${dec(percentile(rtf, 50))} |`,
    );
  }
  out.push('');
  out.push(
    'Latency for batch runs is from the start of the request to the final words, including upload and polling. For streaming runs it is from the last audio chunk to the final words.',
  );
  out.push('');

  const assessed = keys.filter((k) => commonOnly(k).some((s) => s.score.assessment !== null));
  if (assessed.length > 0) {
    out.push('## Built-in reading assessment');
    out.push('');
    out.push("The provider's own miscue flags against the human verdicts, on the same recordings.");
    out.push('');
    out.push('| Run | False error rate | Missed error rate |');
    out.push('| --- | --- | --- |');
    for (const k of assessed) {
      const c = sumCounts(
        commonOnly(k).flatMap((s) => (s.score.assessment ? [s.score.assessment] : [])),
      );
      out.push(
        `| ${k} | ${pct(ratio(c.falseErrors, c.readWords))} | ${pct(ratio(c.missedErrors, c.miscueWords))} |`,
      );
    }
    out.push('');
  }

  out.push('## Flagging low-confidence words');
  out.push('');
  out.push(
    'PLAN.md section 8 flags low-confidence words instead of counting them as errors. Each cell is false error rate / missed error rate when heard substitutions below the threshold are flagged. Skipped words have no confidence and always count.',
  );
  out.push('');
  out.push(`| Run | ${FLAG_THRESHOLDS.map((t) => `below ${t}`).join(' | ')} |`);
  out.push(`| --- | ${FLAG_THRESHOLDS.map(() => '---').join(' | ')} |`);
  for (const k of keys) {
    const items = commonOnly(k);
    const cells = FLAG_THRESHOLDS.map((t) => {
      const c = sumCounts(items.map((s) => s.score.flagged[t]!));
      return `${pct(ratio(c.falseErrors, c.readWords))} / ${pct(ratio(c.missedErrors, c.miscueWords))}`;
    });
    out.push(`| ${k} | ${cells.join(' | ')} |`);
  }
  out.push('');

  out.push('## By group');
  out.push('');
  out.push(
    "False error rate / word error rate for each run and group, on all of that run's recordings.",
  );
  out.push('');
  for (const field of GROUP_FIELDS) {
    const values = [...new Set(transcribed.map((r) => groupValue(r, field, dataset)))].sort();
    out.push(`### ${field}`);
    out.push('');
    out.push(`| Run | ${values.join(' | ')} |`);
    out.push(`| --- | ${values.map(() => '---').join(' | ')} |`);
    for (const k of keys) {
      const cells = values.map((v) => {
        const items = runs.get(k)!.filter((s) => groupValue(s.recording, field, dataset) === v);
        if (!showable(items)) return 'hidden';
        const c = sumCounts(items.map((s) => s.score.errors));
        const edits = items.reduce((n, s) => n + s.score.wordEdits, 0);
        const refLen = items.reduce((n, s) => n + s.score.wordRefLength, 0);
        return `${pct(ratio(c.falseErrors, c.readWords))} / ${pct(ratio(edits, refLen))}`;
      });
      out.push(`| ${k} | ${cells.join(' | ')} |`);
    }
    out.push('');
  }

  out.push('## Vendors');
  out.push('');
  if (vendors.length === 0) {
    out.push('No vendor facts recorded yet (bakeoff/vendors.json).');
  } else {
    out.push(
      '| Provider | Checked on | USD per 1000 min (batch / stream) | Streaming | Word timestamps | Word confidence | Biasing | Region | Retention | Zero retention | Child-data terms |',
    );
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const v of vendors) {
      const price = `${v.pricePer1000MinBatchUsd ?? 'n/a'} / ${v.pricePer1000MinStreamUsd ?? 'n/a'}`;
      out.push(
        `| ${v.vendor} ${v.product} | ${v.checkedOn} | ${price} | ${v.streaming} | ${v.wordTimestamps} | ${v.wordConfidence} | ${v.biasing} | ${v.region} | ${v.retention} | ${v.zeroRetention} | ${v.childTerms} |`,
      );
    }
    out.push('');
    out.push('Sources:');
    out.push('');
    for (const v of vendors) for (const s of v.sources) out.push(`- ${v.vendor}: ${s}`);
  }
  out.push('');
  return out.join('\n');
}
