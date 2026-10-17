import { describe, expect, it } from 'vitest';
import { createLogger, memorySink } from './log';
import { gatewayCost, meterCall, speechCost, type CallRecord, type CallSink } from './meter';

function setup(failingSink = false) {
  const calls: CallRecord[] = [];
  const sink: CallSink = {
    record: async (c) => {
      if (failingSink) throw new Error('db down');
      calls.push(c);
    },
  };
  const lines = memorySink();
  const logger = createLogger({ service: 'test', sink: lines });
  let t = 1000;
  const clock = () => (t += 250);
  return { calls, sink, lines, logger, clock };
}

describe('meterCall', () => {
  it('records latency, cost and outcome for a successful call', async () => {
    const s = setup();
    const result = await meterCall(
      { kind: 'story', model: 'google/story', learnerUserId: 'L1', runId: 'R1' },
      async () => ({ output: 'ok', providerMetadata: { gateway: { cost: '0.0012' } } }),
      {
        sink: s.sink,
        logger: s.logger,
        clock: s.clock,
        cost: (r) => gatewayCost(r.providerMetadata),
      },
    );
    expect(result.output).toBe('ok');
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0]).toMatchObject({
      kind: 'story',
      model: 'google/story',
      outcome: 'ok',
      latencyMs: 250,
      costUsd: 0.0012,
      learnerUserId: 'L1',
      storyId: null,
      runId: 'R1',
    });
  });

  it('records an error and rethrows it', async () => {
    const s = setup();
    await expect(
      meterCall(
        { kind: 'notes', model: 'm' },
        async () => {
          throw new Error('boom');
        },
        { sink: s.sink, logger: s.logger },
      ),
    ).rejects.toThrow('boom');
    expect(s.calls[0]!.outcome).toBe('error');
  });

  it('classifies timeouts', async () => {
    const s = setup();
    const err = Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' });
    await expect(
      meterCall({ kind: 'speech', model: 'p' }, () => Promise.reject(err), {
        sink: s.sink,
        logger: s.logger,
      }),
    ).rejects.toBe(err);
    expect(s.calls[0]!.outcome).toBe('timeout');
  });

  it('uses the outcome classifier for replies that fail validation', async () => {
    const s = setup();
    await meterCall({ kind: 'verifier', model: 'm' }, async () => ({ valid: false }), {
      sink: s.sink,
      logger: s.logger,
      outcome: (r) => (r.valid ? 'ok' : 'invalid'),
    });
    expect(s.calls[0]!.outcome).toBe('invalid');
  });

  it('a failing sink is logged and does not break the call', async () => {
    const s = setup(true);
    await expect(
      meterCall({ kind: 'tts', model: 'm' }, async () => 42, { sink: s.sink, logger: s.logger }),
    ).resolves.toBe(42);
    expect(s.lines.lines.some((l) => l.line.includes('ai.call.record_failed'))).toBe(true);
  });

  it('logs the call without any prompt or reply content', async () => {
    const s = setup();
    await meterCall(
      { kind: 'story', model: 'm' },
      async () => ({ text: 'Once upon a time Maria' }),
      { sink: s.sink, logger: s.logger },
    );
    const all = s.lines.lines.map((l) => l.line).join('\n');
    expect(all).toContain('"event":"ai.call"');
    expect(all).not.toContain('Maria');
  });
});

describe('gatewayCost', () => {
  it('reads a string or number cost', () => {
    expect(gatewayCost({ gateway: { cost: '0.5' } })).toBe(0.5);
    expect(gatewayCost({ gateway: { cost: 0.25 } })).toBe(0.25);
  });

  it('returns null when the cost is missing or bad', () => {
    expect(gatewayCost(undefined)).toBeNull();
    expect(gatewayCost({ gateway: {} })).toBeNull();
    expect(gatewayCost({ gateway: { cost: 'abc' } })).toBeNull();
    expect(gatewayCost({ gateway: { cost: '-1' } })).toBeNull();
  });
});

describe('speechCost', () => {
  it('bills by the minute from configuration', () => {
    expect(speechCost(90, 0.02)).toBeCloseTo(0.03);
    expect(speechCost(90, null)).toBeNull();
  });
});
