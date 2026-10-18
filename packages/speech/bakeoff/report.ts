/**
 * Turns stored provider results into REPORT.md. Only aggregated numbers leave this file:
 * no audio, no transcript text, no reader codes, and no group smaller than the minimum cell.
 *
 * Runs cover different recordings (consent per company, failed calls, length limits), so there
 * is no single shared set. The report shows each run on its own recordings, a head-to-head per
 * tier among runs that cover that tier, and pairwise tables for runs with partial coverage.
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
/** A run with results for less than this share of the recordings it tried is partial. */
export const FULL_COVERAGE = 0.8;

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

interface Run {
  key: string;
  /** Successful, transcribed recordings. */
  items: Scored[];
  /** Every attempt on a transcribed recording, including failures and too_long. */
  attempts: StoredResult[];
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

function readerCount(recs: Recording[]): number {
  return new Set(recs.map((r) => r.readerCode)).size;
}

function showable(recs: Recording[]): boolean {
  return recs.length >= MIN_RECORDINGS && readerCount(recs) >= MIN_READERS;
}

/** Error rates with reader-resampled intervals for a set of scored recordings. */
function rates(items: Scored[]) {
  const c = sumCounts(items.map((s) => s.score.errors));
  const edits = items.reduce((n, s) => n + s.score.wordEdits, 0);
  const refLen = items.reduce((n, s) => n + s.score.wordRefLength, 0);
  return {
    wer: ratio(edits, refLen),
    werCi: clusterBootstrapRatio(byReader(items, (s) => [s.wordEdits, s.wordRefLength])),
    fer: ratio(c.falseErrors, c.readWords),
    ferCi: clusterBootstrapRatio(
      byReader(items, (s) => [s.errors.falseErrors, s.errors.readWords]),
    ),
    mer: ratio(c.missedErrors, c.miscueWords),
    merCi: clusterBootstrapRatio(
      byReader(items, (s) => [s.errors.missedErrors, s.errors.miscueWords]),
    ),
  };
}

/** Old results without the field are treated as having confidence. */
const hasConfidence = (run: Run) => run.items.every((s) => s.result.hasWordConfidence !== false);

function coverage(run: Run, ids?: Set<string>): number {
  const tried = run.attempts.filter((a) => !ids || ids.has(a.recordingId));
  const ok = tried.filter((a) => a.ok).length;
  return tried.length === 0 ? 0 : ok / tried.length;
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
  const runMap = new Map<string, Run>();
  for (const result of results) {
    if (result.provider === 'oracle' && !opts.includeOracle) continue;
    const recording = recById.get(result.recordingId);
    const rows = dataset.truth.get(result.recordingId);
    if (!recording || !rows) continue;
    const key = runKey(result);
    const run = runMap.get(key) ?? { key, items: [], attempts: [] };
    runMap.set(key, run);
    run.attempts.push(result);
    if (!result.ok) continue;
    const words = passageWords(dataset.passages.get(recording.passageId)!);
    run.items.push({
      recording,
      result,
      score: scoreRecording(
        words,
        rows,
        result.words,
        result.assessment,
        result.hasWordConfidence !== false,
      ),
    });
  }
  const runs = [...runMap.values()].sort((a, b) => a.key.localeCompare(b.key));

  const out: string[] = [];
  const transcribed = dataset.recordings.filter((r) => dataset.truth.has(r.recordingId));
  const wordCount = transcribed.reduce(
    (n, r) => n + passageWords(dataset.passages.get(r.passageId)!).length,
    0,
  );

  out.push('# Speech bake-off report');
  out.push('');
  out.push(
    `Generated ${opts.generatedOn} by \`pnpm --filter @basabridge/speech bakeoff report\`. Aggregated numbers only. Groups with fewer than ${MIN_RECORDINGS} recordings or ${MIN_READERS} readers are hidden. The decision rule is in bakeoff/README.md.`,
  );
  out.push('');

  out.push('## Test set');
  out.push('');
  out.push(
    `${transcribed.length} transcribed recordings from ${readerCount(transcribed)} readers, ${wordCount} passage words.`,
  );
  out.push('');
  out.push('| Group | Value | Recordings |');
  out.push('| --- | --- | --- |');
  for (const field of GROUP_FIELDS) {
    const groups = new Map<string, Recording[]>();
    for (const r of transcribed) {
      const v = groupValue(r, field, dataset);
      groups.set(v, [...(groups.get(v) ?? []), r]);
    }
    for (const [v, list] of [...groups.entries()].sort()) {
      out.push(`| ${field} | ${v} | ${showable(list) ? String(list.length) : 'hidden'} |`);
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

  out.push('## Run settings');
  out.push('');
  out.push('| Run | Model | Locale | Endpoint | Region | Run dates | Word confidence |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const run of runs) {
    const s = run.attempts.find((x) => x.settings)?.settings;
    const dates = [...new Set(run.attempts.map((x) => x.runDate ?? 'not recorded'))].sort();
    const range = dates.length > 1 ? `${dates[0]} to ${dates[dates.length - 1]}` : dates[0];
    out.push(
      `| ${run.key} | ${s?.model ?? 'not recorded'} | ${s?.locale ?? 'not recorded'} | ${s?.endpoint ?? 'not recorded'} | ${s?.region ?? 'not recorded'} | ${range} | ${hasConfidence(run) ? 'yes' : 'no'} |`,
    );
  }
  out.push('');

  out.push('## Each run on its own recordings');
  out.push('');
  out.push(
    'Word error rate is against what the reader actually said. False error rate is the share of words read correctly that the provider would mark wrong, the number that hurts children most. Missed error rate is the share of real misreadings the provider would accept. Ranges are 95% intervals from resampling readers. Runs cover different recordings, so compare them in the head-to-head tables below, not here.',
  );
  out.push('');
  out.push(
    '| Run | Recordings | Failed calls | Too long | Failed deletions | Word error rate | False error rate | Missed error rate |',
  );
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const run of runs) {
    const r = rates(run.items);
    const failed = run.attempts.filter((x) => !x.ok && x.error !== 'too_long').length;
    const tooLong = run.attempts.filter((x) => x.error === 'too_long').length;
    const delFailed = run.attempts.filter((x) => x.deleteFailed).length;
    out.push(
      `| ${run.key} | ${run.items.length} | ${failed} | ${tooLong} | ${delFailed} | ${pct(r.wer)}${ci(r.werCi)} | ${pct(r.fer)}${ci(r.ferCi)} | ${pct(r.mer)}${ci(r.merCi)} |`,
    );
  }
  out.push('');

  out.push('### Timing and confidence');
  out.push('');
  out.push(
    'Timestamp errors use correct words that have human times. Confidence separation is the AUROC of confidence for telling wrong words from right ones: 1 is perfect, 0.5 is chance. It measures ranking, not calibration. Runs without real per-word confidence show n/a. Batch latency is request to final words, including upload and polling; streaming latency is last audio chunk to final words. Real-time factor is shown for batch only, since streaming is paced at real time.',
  );
  out.push('');
  out.push(
    '| Run | Timed words | Start error mean / p90 | End error mean / p90 | Confidence separation | Mean confidence right / wrong | Latency p50 / p95 | First word p50 | Real-time factor p50 |',
  );
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const run of runs) {
    const starts = run.items.flatMap((s) => s.score.startErrorsMs);
    const ends = run.items.flatMap((s) => s.score.endErrorsMs);
    const conf = run.items.flatMap((s) => s.score.confidence);
    const wrong = run.items.flatMap((s) => s.score.wrong);
    const real = hasConfidence(run);
    const stream = run.items.some((s) => s.result.transport === 'stream');
    const lat = run.items.map((s) =>
      s.result.transport === 'stream'
        ? (s.result.finalAfterEndMs ?? s.result.latencyMs)
        : s.result.latencyMs,
    );
    const first = run.items.flatMap((s) =>
      s.result.firstWordMs !== undefined ? [s.result.firstWordMs] : [],
    );
    const rtf = run.items
      .filter((s) => s.result.audioSeconds > 0)
      .map((s) => s.result.latencyMs / 1000 / s.result.audioSeconds);
    const confCells = real
      ? `${dec(
          auroc(
            conf.map((x) => 1 - x),
            wrong,
          ),
        )} | ${dec(mean(conf.filter((_, i) => !wrong[i])))} / ${dec(mean(conf.filter((_, i) => wrong[i])))}`
      : 'n/a | n/a';
    out.push(
      `| ${run.key} | ${starts.length} | ${ms(mean(starts))} / ${ms(percentile(starts, 90))} | ${ms(mean(ends))} / ${ms(percentile(ends, 90))} | ${confCells} | ${sec(percentile(lat, 50))} / ${sec(percentile(lat, 95))} | ${stream ? sec(percentile(first, 50)) : 'n/a'} | ${stream ? 'n/a' : dec(percentile(rtf, 50))} |`,
    );
  }
  out.push('');

  const full = runs.filter((r) => coverage(r) >= FULL_COVERAGE);
  const partial = runs.filter((r) => coverage(r) < FULL_COVERAGE);

  out.push('## Head to head by tier');
  out.push('');
  out.push(
    `Within each tier, the runs that have results for at least ${FULL_COVERAGE * 100}% of the recordings they tried in that tier, compared on the recordings all of them have. A run below that line in a tier is listed as partial and compared pairwise further down. A run with no successful results never shrinks a table.`,
  );
  out.push('');
  const tiers = [...new Set(transcribed.map((r) => groupValue(r, 'tier', dataset)))].sort(
    (x, y) => Number(x.split(' ')[1]!.split('-')[0]) - Number(y.split(' ')[1]!.split('-')[0]),
  );
  for (const tier of tiers) {
    const tierIds = new Set(
      transcribed.filter((r) => groupValue(r, 'tier', dataset) === tier).map((r) => r.recordingId),
    );
    const inTier = runs.filter((r) => coverage(r, tierIds) >= FULL_COVERAGE);
    const left = runs.filter(
      (r) => !inTier.includes(r) && r.attempts.some((x) => tierIds.has(x.recordingId)),
    );
    let shared = new Set(tierIds);
    for (const r of inTier) {
      const ids = new Set(r.items.map((s) => s.recording.recordingId));
      shared = new Set([...shared].filter((id) => ids.has(id)));
    }
    const sharedRecs = transcribed.filter((r) => shared.has(r.recordingId));
    out.push(`### ${tier}`);
    out.push('');
    if (inTier.length === 0) {
      out.push('No run covers this tier.');
    } else if (!showable(sharedRecs)) {
      out.push(
        `Hidden: the shared set has fewer than ${MIN_RECORDINGS} recordings or ${MIN_READERS} readers.`,
      );
    } else {
      out.push(`${sharedRecs.length} shared recordings from ${readerCount(sharedRecs)} readers.`);
      out.push('');
      out.push('| Run | Word error rate | False error rate | Missed error rate |');
      out.push('| --- | --- | --- | --- |');
      for (const r of inTier) {
        const x = rates(r.items.filter((s) => shared.has(s.recording.recordingId)));
        out.push(
          `| ${r.key} | ${pct(x.wer)}${ci(x.werCi)} | ${pct(x.fer)}${ci(x.ferCi)} | ${pct(x.mer)}${ci(x.merCi)} |`,
        );
      }
    }
    if (left.length > 0) {
      out.push('');
      out.push(
        `Partial in this tier: ${left.map((r) => `${r.key} (${Math.round(coverage(r, tierIds) * 100)}%)`).join(', ')}.`,
      );
    }
    out.push('');
  }

  if (partial.length > 0 && full.length > 0) {
    out.push('## Pairwise for partial runs');
    out.push('');
    out.push(
      'Each partial run against each full run, on the recordings both have. Cells are partial run / other run.',
    );
    out.push('');
    for (const p of partial) {
      out.push(`### ${p.key}`);
      out.push('');
      out.push(
        '| Against | Shared recordings | Word error rate | False error rate | Missed error rate |',
      );
      out.push('| --- | --- | --- | --- | --- |');
      const pIds = new Set(p.items.map((s) => s.recording.recordingId));
      for (const f of full) {
        const shared = f.items.filter((s) => pIds.has(s.recording.recordingId));
        const ids = new Set(shared.map((s) => s.recording.recordingId));
        if (!showable(shared.map((s) => s.recording))) {
          out.push(`| ${f.key} | hidden | | | |`);
          continue;
        }
        const x = rates(p.items.filter((s) => ids.has(s.recording.recordingId)));
        const y = rates(shared);
        out.push(
          `| ${f.key} | ${ids.size} | ${pct(x.wer)} / ${pct(y.wer)} | ${pct(x.fer)} / ${pct(y.fer)} | ${pct(x.mer)} / ${pct(y.mer)} |`,
        );
      }
      out.push('');
    }
  }

  const assessed = runs.filter((r) => r.items.some((s) => s.score.assessment !== null));
  if (assessed.length > 0) {
    out.push('## Built-in reading assessment');
    out.push('');
    out.push(
      "The provider's own miscue flags against the human verdicts, on that run's recordings.",
    );
    out.push('');
    out.push('| Run | Recordings | False error rate | Missed error rate |');
    out.push('| --- | --- | --- | --- |');
    for (const r of assessed) {
      const list = r.items.flatMap((s) => (s.score.assessment ? [s.score.assessment] : []));
      const c = sumCounts(list);
      out.push(
        `| ${r.key} | ${list.length} | ${pct(ratio(c.falseErrors, c.readWords))} | ${pct(ratio(c.missedErrors, c.miscueWords))} |`,
      );
    }
    out.push('');
  }

  out.push("## With the app's alignment engine");
  out.push('');
  out.push(
    "The same provider words marked by the app's alignment engine (BB-25) instead of the bake-off's simple alignment, on that run's recordings. This is closer to what a learner would see, because the engine also flags unsure words and matches contractions and spoken numbers. The decision rule uses the tables above; this one shows how much the engine changes the picture. Runs without real per-word confidence are scored as if every word were confident.",
  );
  out.push('');
  out.push('| Run | Recordings | False error rate | Missed error rate |');
  out.push('| --- | --- | --- | --- |');
  for (const run of runs) {
    const items = run.items.filter((s) => s.score.engine !== null);
    const c = sumCounts(items.map((s) => s.score.engine!));
    const ferCi = clusterBootstrapRatio(
      byReader(items, (s) => [s.engine!.falseErrors, s.engine!.readWords]),
    );
    const merCi = clusterBootstrapRatio(
      byReader(items, (s) => [s.engine!.missedErrors, s.engine!.miscueWords]),
    );
    out.push(
      `| ${run.key} | ${items.length} | ${pct(ratio(c.falseErrors, c.readWords))}${ci(ferCi)} | ${pct(ratio(c.missedErrors, c.miscueWords))}${ci(merCi)} |`,
    );
  }
  out.push('');

  out.push('## Flagging low-confidence words');
  out.push('');
  out.push(
    "PLAN.md section 8 flags low-confidence words instead of counting them as errors. Each cell is false error rate / missed error rate when heard substitutions below the threshold are flagged, on that run's recordings. Skipped words have no confidence and always count. Runs without real per-word confidence are n/a.",
  );
  out.push('');
  out.push(`| Run | ${FLAG_THRESHOLDS.map((t) => `below ${t}`).join(' | ')} |`);
  out.push(`| --- | ${FLAG_THRESHOLDS.map(() => '---').join(' | ')} |`);
  for (const run of runs) {
    const cells = FLAG_THRESHOLDS.map((t) => {
      if (!hasConfidence(run)) return 'n/a';
      const c = sumCounts(run.items.map((s) => s.score.flagged[t]!));
      return `${pct(ratio(c.falseErrors, c.readWords))} / ${pct(ratio(c.missedErrors, c.miscueWords))}`;
    });
    out.push(`| ${run.key} | ${cells.join(' | ')} |`);
  }
  out.push('');

  out.push('## By group');
  out.push('');
  out.push(
    "False error rate / word error rate for each run and group, on that run's recordings. Coverage differs between runs, so read these within a row.",
  );
  out.push('');
  for (const field of GROUP_FIELDS) {
    const values = [...new Set(transcribed.map((r) => groupValue(r, field, dataset)))].sort();
    out.push(`### ${field}`);
    out.push('');
    out.push(`| Run | ${values.join(' | ')} |`);
    out.push(`| --- | ${values.map(() => '---').join(' | ')} |`);
    for (const run of runs) {
      const cells = values.map((v) => {
        const items = run.items.filter((s) => groupValue(s.recording, field, dataset) === v);
        if (!showable(items.map((s) => s.recording))) return 'hidden';
        const x = rates(items);
        return `${pct(x.fer)} / ${pct(x.wer)}`;
      });
      out.push(`| ${run.key} | ${cells.join(' | ')} |`);
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
