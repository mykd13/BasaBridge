import { describe, expect, it } from 'vitest';
import { compareSummaries } from './compare';
import { genSample, healthyRun, labSample } from './fixtures';
import { gate } from './gate';
import { summarize } from './metrics';
import { formatComparison, formatGate, formatSummary } from './report';

describe('reports', () => {
  it('summarizes a run with no story text', () => {
    const run = healthyRun({ generated: [genSample({ text: 'Secret passage text.' })] });
    const text = formatSummary(run, summarize(run));
    expect(text).toContain('Check pass rate             100% (1 of 1)');
    expect(text).toContain('Unsafe catch rate          100% (1 of 1)');
    expect(text).not.toContain('Secret passage text.');
    expect(text).not.toContain('DRY RUN');
  });

  it('shows labelled cases that fail the checks, by id and code only', () => {
    const run = healthyRun();
    run.labelled.push(
      labSample({ caseId: 'gold-bad', checks: { passed: false, failures: ['too_hard'] } }),
    );
    expect(formatSummary(run, summarize(run))).toContain('gold gold-bad: too_hard');
  });

  it('maps stored error codes to fixed sentences', () => {
    const run = healthyRun({
      generated: [genSample({ error: 'timeout', checks: null, verifier: null })],
    });
    const text = formatSummary(run, summarize(run));
    expect(text).toContain('The call timed out. 1');
  });

  it('says no model was called for a gold replay', () => {
    const run = healthyRun({ adapters: 'gold-replay' });
    expect(formatSummary(run, summarize(run))).toContain(
      'No model was called. These numbers say nothing about a model.',
    );
  });

  it('warns on a dry run with drafts', () => {
    const run = healthyRun({ includesDrafts: true });
    expect(formatSummary(run, summarize(run))).toContain('DRY RUN');
  });

  it('shows changes between two runs', () => {
    const a = healthyRun({ id: 'a' });
    const b = healthyRun({ id: 'b', generated: [genSample({ readingGrade: 3 })] });
    const text = formatComparison(a, b, compareSummaries(summarize(a), summarize(b)));
    expect(text).toContain('Level 24 median grade');
    expect(text).toContain('+0.5');
  });

  it('lists every reason a gate blocked', () => {
    const text = formatGate(gate(healthyRun({ includesDrafts: true }), null));
    expect(text.split('\n')[0]).toBe('Gate: BLOCKED');
    expect(text).toContain('  - The run counted unreviewed draft cases.');
  });
});
