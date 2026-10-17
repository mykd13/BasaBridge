/** Plain text reports for the eval CLI (BB-21). Numbers only, never story text. */
import type { Delta, RunComparison } from './compare';
import type { GateResult } from './gate';
import type { Rate, RunSummary } from './metrics';
import type { EvalRun } from './run';

const pct = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x * 1000) / 10}%`);
const rate = (r: Rate) => `${pct(r.rate)} (${r.part} of ${r.whole})`;
const usd = (x: number | null) => (x === null ? 'n/a' : `$${x.toFixed(4)}`);
const num = (x: number | null, digits = 1) => (x === null ? 'n/a' : x.toFixed(digits));

function table(rows: string[][]): string[] {
  const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
  return rows.map((r) => `  ${r.map((cell, i) => cell.padEnd(widths[i]!)).join('  ')}`.trimEnd());
}

export function runHeader(run: EvalRun): string[] {
  const lines = [
    `Run ${run.id}`,
    `  adapters ${run.adapters}, story model ${run.storyModel ?? 'none'}, verifier model ${run.verifierModel ?? 'none'}, prompt ${run.promptVersion ?? 'none'}, git ${run.gitSha ?? 'unknown'}`,
  ];
  if (run.includesDrafts) {
    lines.push('  DRY RUN: unreviewed draft cases were counted. Do not quote these numbers.');
  }
  return lines;
}

export function formatSummary(run: EvalRun, s: RunSummary): string {
  const g = s.generation;
  const failures = Object.entries(g.failures)
    .map(([code, n]) => `${code} ${n}`)
    .join(', ');
  return [
    ...runHeader(run),
    '',
    'Generation and checks',
    ...table([
      ['Stories attempted', String(g.attempted)],
      ['Check pass rate', rate(g.checkPassRate)],
      ['Failures', failures || 'none'],
      ['Flagged unsafe by verifier', String(g.flaggedUnsafe)],
      ['Verifier errors', String(g.verifierErrors)],
      ['Accepted', String(g.accepted)],
    ]),
    '',
    'Difficulty by level',
    ...(s.drift.length === 0
      ? ['  No stories generated.']
      : table([
          [
            'Level',
            'Stories',
            'Median words',
            'Range',
            'Median grade',
            'Cap',
            'Out of range',
            'Over cap',
          ],
          ...s.drift.map((d) => [
            String(d.level),
            String(d.stories),
            num(d.medianWords, 0),
            `${d.wordRange.min}-${d.wordRange.max}`,
            num(d.medianGrade),
            String(d.maxReadingGrade),
            String(d.outOfRange),
            String(d.overCap),
          ]),
        ])),
    '',
    `Verifier on labelled cases (${s.verifier.gold} gold, ${s.verifier.safety} safety)`,
    ...table([
      ['Wrong-key catch rate', rate(s.verifier.wrongKeyCatch)],
      ['Good-key false alarm rate', rate(s.verifier.goodKeyFalseAlarm)],
      ['Unsafe catch rate', rate(s.verifier.unsafeCatch)],
      ['Safe false alarm rate', rate(s.verifier.safeFalseAlarm)],
      ['Call errors', String(s.verifier.errors)],
    ]),
    '',
    'Cost',
    ...table([
      ['Total', usd(s.cost.usd)],
      ['Unpriced samples', String(s.cost.unpriced)],
      ['Tokens in / out', `${s.cost.inputTokens} / ${s.cost.outputTokens}`],
      ['Per story', usd(s.cost.perStoryUsd)],
      ['Per accepted story', usd(s.cost.perAcceptedStoryUsd)],
    ]),
  ].join('\n');
}

const deltaRow = (label: string, d: Delta, fmt: (x: number | null) => string) => [
  label,
  fmt(d.baseline),
  fmt(d.candidate),
  d.change === null ? 'n/a' : `${d.change >= 0 ? '+' : ''}${fmt(d.change)}`,
];

export function formatComparison(baseline: EvalRun, candidate: EvalRun, c: RunComparison): string {
  return [
    'Baseline',
    ...runHeader(baseline),
    'Candidate',
    ...runHeader(candidate),
    '',
    ...table([
      ['', 'Baseline', 'Candidate', 'Change'],
      deltaRow('Check pass rate', c.checkPassRate, pct),
      deltaRow('Wrong-key catch rate', c.wrongKeyCatch, pct),
      deltaRow('Good-key false alarm rate', c.goodKeyFalseAlarm, pct),
      deltaRow('Unsafe catch rate', c.unsafeCatch, pct),
      deltaRow('Safe false alarm rate', c.safeFalseAlarm, pct),
      deltaRow('Cost per story', c.perStoryUsd, usd),
      deltaRow('Cost per accepted story', c.perAcceptedStoryUsd, usd),
      ...c.levels.map((l) =>
        deltaRow(`Level ${l.level} median grade`, l.medianGrade, (x) => num(x)),
      ),
    ]),
  ].join('\n');
}

export function formatGate(g: GateResult): string {
  return [
    g.pass ? 'Gate: PASS' : 'Gate: BLOCKED',
    ...g.failures.map((f) => `  - ${f}`),
    ...(g.notes.length ? ['Notes', ...g.notes.map((n) => `  - ${n}`)] : []),
  ].join('\n');
}
