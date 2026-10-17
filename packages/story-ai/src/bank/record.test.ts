import { describe, expect, it } from 'vitest';
import { GenerationRecord, logRecord, timedRun, toRecord } from './record';
import { captureLog, fakePipeline, fixedClock, storyFixture } from './testing';
import type { PipelineInput, PipelineOutcome, StoryErrorKind } from './types';

const input: PipelineInput = { level: 24, topic: 'animals', focus: null, recentTitles: [] };

const okOutcome = (): PipelineOutcome => ({
  ok: true,
  story: storyFixture(24, 'The Mango Tree'),
  usage: { inputTokens: 120, outputTokens: 340, costUsd: 0.002, attempts: 2 },
});

const failOutcome = (kind: StoryErrorKind): PipelineOutcome => ({
  ok: false,
  error: { kind, reason: 'because' },
  usage: { attempts: 1 },
});

describe('timedRun and toRecord', () => {
  it('holds latency and usage from the pipeline and clock', async () => {
    const pipeline = fakePipeline([okOutcome()]);
    const { outcome, latencyMs } = await timedRun(pipeline, input, fixedClock([1000, 1450]));
    expect(latencyMs).toBe(450);
    expect(toRecord(input, outcome, latencyMs, 'refill')).toEqual({
      level: 24,
      topic: 'animals',
      outcome: 'stored',
      attempts: 2,
      latencyMs: 450,
      inputTokens: 120,
      outputTokens: 340,
      costUsd: 0.002,
      trigger: 'refill',
    });
  });

  it.each([
    ['checks_failed', 'rejected'],
    ['verifier_rejected', 'rejected'],
    ['config', 'failed'],
    ['model_call', 'failed'],
    ['invalid_output', 'failed'],
  ] as const)('maps %s to %s', (kind, expected) => {
    const record = toRecord(input, failOutcome(kind), 5, 'live');
    expect(record.outcome).toBe(expected);
    expect(record.errorKind).toBe(kind);
  });

  it('turns a throwing pipeline into a failed model_call', async () => {
    const pipeline = fakePipeline(() => {
      throw new Error('network down');
    });
    const { outcome, latencyMs } = await timedRun(pipeline, input, fixedClock([0, 10]));
    expect(outcome.ok).toBe(false);
    const record = toRecord(input, outcome, latencyMs, 'live');
    expect(record.outcome).toBe('failed');
    expect(record.errorKind).toBe('model_call');
  });
});

describe('privacy (golden rule 2)', () => {
  it('logs only the allowed keys and no story text, names or audio', () => {
    const outcome = okOutcome();
    if (!outcome.ok) throw new Error('fixture should be ok');
    const { log, events } = captureLog();
    logRecord(log, toRecord(input, outcome, 450, 'refill'));

    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe('story_generation');
    expect(Object.keys(events[0]!.data).sort()).toEqual(
      [
        'attempts',
        'costUsd',
        'inputTokens',
        'latencyMs',
        'level',
        'outcome',
        'outputTokens',
        'topic',
        'trigger',
      ].sort(),
    );

    const text = JSON.stringify(events[0]!.data).toLowerCase();
    expect(text).not.toContain(outcome.story.text.toLowerCase());
    expect(text).not.toContain(outcome.story.title.toLowerCase());
    for (const word of ['name', 'username', 'learner', 'audio']) expect(text).not.toContain(word);
  });

  it('rejects an extra key such as learnerId', () => {
    const record = toRecord(input, okOutcome(), 1, 'live');
    expect(GenerationRecord.safeParse({ ...record, learnerId: 'abc' }).success).toBe(false);
  });

  it('refuses to log a record with an extra key', () => {
    const { log, events } = captureLog();
    const bad = { ...toRecord(input, okOutcome(), 1, 'live'), learnerId: 'abc' };
    expect(() => logRecord(log, bad)).toThrow();
    expect(events).toHaveLength(0);
  });
});
