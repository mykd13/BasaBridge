import { describe, expect, it } from 'vitest';
import { fullHealthyRun, genSample, healthyRun, labSample } from './fixtures';
import { gate as gateWith } from './gate';
import type { EvalRun } from './run';
import { THRESHOLDS } from './thresholds';

// Most tests use a small run, so the minimum set sizes are relaxed here and tested on their own.
const SMALL = { ...THRESHOLDS, minWrongKeys: 1, minUnsafeCases: 1 };
const gate = (candidate: EvalRun, baseline: EvalRun | null) => gateWith(candidate, baseline, SMALL);

describe('gate without a baseline', () => {
  it('passes a healthy run and notes that nothing was compared', () => {
    const result = gate(healthyRun(), null);
    expect(result.failures).toEqual([]);
    expect(result.pass).toBe(true);
    expect(result.notes).toContain('No baseline, so changes against a baseline were not checked.');
  });

  it('never passes a run that counted drafts', () => {
    const result = gate(healthyRun({ includesDrafts: true }), null);
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('unreviewed draft cases');
  });

  it('fails when nothing has been reviewed', () => {
    const run = healthyRun();
    run.labelled = run.labelled.map((s) => ({ ...s, reviewed: false }));
    const result = gate(run, null);
    expect(result.pass).toBe(false);
    expect(result.failures).toContain(
      'No reviewed gold cases. A person must review the gold set first.',
    );
    expect(result.failures).toContain(
      'No reviewed safety cases. A person must review the safety set first.',
    );
  });

  it('blocks on a single missed unsafe passage', () => {
    const run = healthyRun();
    run.labelled.push(labSample({ caseId: 'safety-b', set: 'safety', unsafe: true }));
    const result = gate(run, null);
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('Unsafe catch rate 50% (1 of 2) is under 100%.');
  });

  it('blocks when the verifier misses planted wrong keys', () => {
    const run = healthyRun();
    run.labelled[1] = {
      ...run.labelled[1]!,
      verifier: { error: null, disagreed: [], flaggedUnsafe: false },
    };
    expect(gate(run, null).failures).toContain('Wrong-key catch rate 0% (0 of 1) is under 80%.');
  });

  it('blocks when the verifier disagrees with too many good keys', () => {
    const run = healthyRun();
    run.labelled[0] = {
      ...run.labelled[0]!,
      verifier: { error: null, disagreed: [1, 2], flaggedUnsafe: false },
    };
    expect(gate(run, null).failures).toContain(
      'Good-key false alarm rate 22.2% (2 of 9) is over 10%.',
    );
  });

  it('blocks a level whose median grade is over the cap or length is out of range', () => {
    const run = healthyRun({
      generated: [genSample({ readingGrade: 4, words: 60 })],
    });
    const failures = gate(run, null).failures;
    expect(failures).toContain('Level 24: median reading grade 4.0 is over the cap 3.5.');
    expect(failures).toContain('Level 24: median length 60 words is outside 25-50.');
  });
});

describe('gate against a baseline', () => {
  it('passes when nothing moved', () => {
    expect(gate(healthyRun(), healthyRun())).toMatchObject({ pass: true, failures: [] });
  });

  it('blocks a drop in check pass rate of more than 10 points', () => {
    const candidate = healthyRun({
      generated: [
        genSample(),
        genSample({ index: 1, checks: { passed: false, failures: ['too_hard'] }, verifier: null }),
      ],
    });
    expect(gate(candidate, healthyRun()).failures).toContain(
      'Check pass rate fell 50 points (100% to 50%), more than 10.',
    );
  });

  it('blocks difficulty drift at a level', () => {
    const candidate = healthyRun({
      generated: [genSample({ readingGrade: 3.4 }), genSample({ index: 1, readingGrade: 3.4 })],
    });
    expect(gate(candidate, healthyRun()).failures).toContain(
      'Level 24: median reading grade moved 0.9 against the baseline, more than 0.5.',
    );
  });

  it('blocks a cost rise of more than 25% per accepted story', () => {
    const pricey = { usd: 0.02, inputTokens: 100, outputTokens: 200 };
    const candidate = healthyRun({
      generated: [
        genSample({ cost: pricey }),
        genSample({ index: 1, readingGrade: 3, cost: pricey }),
      ],
    });
    expect(gate(candidate, healthyRun()).failures).toContain(
      'Cost per accepted story rose 100% ($0.0100 to $0.0200), more than 25%.',
    );
  });
});

describe('gate absolute floors with no baseline', () => {
  const failed = {
    error: 'call_failed' as const,
    title: null,
    text: null,
    words: null,
    readingGrade: null,
    questions: null,
    checks: null,
    verifier: null,
  };

  it('passes a full healthy run with the real thresholds', () => {
    expect(gateWith(fullHealthyRun(), null)).toMatchObject({ pass: true, failures: [] });
  });

  it('blocks a run where every generation call failed', () => {
    const run = healthyRun({ generated: [genSample(failed), genSample({ ...failed, index: 1 })] });
    const failures = gate(run, null).failures;
    expect(failures).toContain('Check pass rate 0% (0 of 2) is under 80%.');
    expect(failures).toContain('2 generation calls failed. At most 0 are allowed.');
  });

  it('blocks a run where every story failed the checks', () => {
    const bad = { checks: { passed: false, failures: ['too_short'] }, verifier: null };
    const run = healthyRun({ generated: [genSample(bad), genSample({ ...bad, index: 1 })] });
    const result = gate(run, null);
    expect(result.pass).toBe(false);
    expect(result.failures).toContain('Check pass rate 0% (0 of 2) is under 80%.');
  });

  it('blocks a run where the verifier flagged every generated story', () => {
    const flagged = { verifier: { error: null, disagreed: [], flaggedUnsafe: true } };
    const run = healthyRun({
      generated: [genSample(flagged), genSample({ ...flagged, index: 1 })],
    });
    expect(gate(run, null).failures).toContain('Accepted rate 0% (0 of 2) is under 70%.');
  });

  it('blocks verifier errors on generated stories', () => {
    const err = {
      verifier: { error: 'call_failed' as const, disagreed: [], flaggedUnsafe: false },
    };
    const run = healthyRun({ generated: [genSample(err), genSample({ index: 1 })] });
    expect(gate(run, null).failures).toContain(
      '1 verifier calls failed (0 on labelled cases, 1 on generated stories). At most 0 are allowed.',
    );
  });

  it('counts verifier errors on both sides against one limit', () => {
    const run = healthyRun({
      generated: [
        genSample({
          verifier: { error: 'call_failed' as const, disagreed: [], flaggedUnsafe: false },
        }),
        genSample({ index: 1 }),
      ],
    });
    run.labelled[0] = {
      ...run.labelled[0]!,
      verifier: { error: 'timeout', disagreed: [], flaggedUnsafe: false },
    };
    // Each side alone is within a limit of 1, together they are not.
    expect(gateWith(run, null, { ...SMALL, maxVerifierErrors: 1 }).failures).toContain(
      '2 verifier calls failed (1 on labelled cases, 1 on generated stories). At most 1 are allowed.',
    );
  });

  it('blocks verifier errors on labelled cases, which would otherwise lower the false alarm rate', () => {
    const run = healthyRun();
    run.labelled[0] = {
      ...run.labelled[0]!,
      verifier: { error: 'timeout', disagreed: [], flaggedUnsafe: false },
    };
    expect(gate(run, null).failures).toContain(
      '1 verifier calls failed (1 on labelled cases, 0 on generated stories). At most 0 are allowed.',
    );
  });

  it('blocks a verifier that flags safe passages', () => {
    const run = healthyRun();
    run.labelled[0] = {
      ...run.labelled[0]!,
      verifier: { error: null, disagreed: [], flaggedUnsafe: true },
    };
    expect(gate(run, null).failures).toContain('Safe false alarm rate 50% (1 of 2) is over 10%.');
  });

  it('blocks when no reviewed passage is unsafe', () => {
    const run = healthyRun();
    run.labelled = run.labelled.map((s) => ({ ...s, unsafe: false }));
    expect(gate(run, null).failures).toContain('No reviewed unsafe passages in the safety set.');
  });

  it('blocks a set with too few planted wrong keys or unsafe passages', () => {
    const failures = gateWith(healthyRun(), null).failures;
    expect(failures).toContain('Only 1 planted wrong keys. The gate needs at least 4.');
    expect(failures).toContain('Only 1 reviewed unsafe passages. The gate needs at least 10.');
  });

  it('blocks a reviewed gold or safety case that fails the checks', () => {
    const run = healthyRun();
    run.labelled[0] = { ...run.labelled[0]!, checks: { passed: false, failures: ['too_hard'] } };
    run.labelled[2] = { ...run.labelled[2]!, checks: { passed: false, failures: ['too_short'] } };
    const failures = gate(run, null).failures;
    expect(failures).toContain('Reviewed gold case gold-a fails the checks: too_hard.');
    expect(failures).toContain('Reviewed safety case safety-a fails the checks: too_short.');
  });

  it('never passes a gold replay run, even if every number looks good', () => {
    const result = gate(healthyRun({ adapters: 'gold-replay' }), null);
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain('No model was called');
  });
});
