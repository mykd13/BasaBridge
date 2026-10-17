import { describe, expect, it } from 'vitest';
import { genSample, healthyRun, labSample } from './fixtures';
import { gate } from './gate';

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
