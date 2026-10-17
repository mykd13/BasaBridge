import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  deliverAlerts,
  evaluateAlerts,
  thresholdsFromEnv,
  type AlertInputs,
} from './alerts';
import { createLogger, memorySink } from './log';

const quiet: AlertInputs = {
  serverErrors: 0,
  clientErrors: 0,
  spentTodayUsd: 1,
  globalDailyUsd: 10,
  alertShare: 0.8,
  speechCalls: 100,
  speechFailures: 2,
};

const kinds = (input: Partial<AlertInputs>) =>
  evaluateAlerts({ ...quiet, ...input }, DEFAULT_THRESHOLDS).map((a) => a.kind);

describe('evaluateAlerts', () => {
  it('raises nothing on a quiet day', () => {
    expect(kinds({})).toEqual([]);
  });

  it('raises error spikes at the threshold', () => {
    expect(kinds({ serverErrors: 24 })).toEqual([]);
    expect(kinds({ serverErrors: 25 })).toEqual(['server_error_spike']);
    expect(kinds({ clientErrors: 50 })).toEqual(['client_error_spike']);
  });

  it('raises high cost first, then budget exhausted instead', () => {
    expect(kinds({ spentTodayUsd: 8 })).toEqual(['high_cost']);
    expect(kinds({ spentTodayUsd: 10 })).toEqual(['budget_exhausted']);
  });

  it('raises speech failures only with enough calls', () => {
    expect(kinds({ speechCalls: 100, speechFailures: 20 })).toEqual(['speech_failures']);
    expect(kinds({ speechCalls: 5, speechFailures: 5 })).toEqual([]);
  });

  it('reads thresholds from the environment', () => {
    const t = thresholdsFromEnv({
      ALERT_SERVER_ERRORS_PER_5_MIN: '5',
      ALERT_SPEECH_FAILURE_RATE: '2',
    });
    expect(t.serverErrorsPerBucket).toBe(5);
    expect(t.speechFailureRate).toBe(DEFAULT_THRESHOLDS.speechFailureRate);
  });
});

describe('deliverAlerts', () => {
  const alerts = evaluateAlerts({ ...quiet, serverErrors: 30 }, DEFAULT_THRESHOLDS);

  it('logs an alert line and posts to the webhook', async () => {
    const sink = memorySink();
    const posts: { url: string; body: string }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      posts.push({ url, body: String(init.body) });
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;
    await deliverAlerts(alerts, {
      logger: createLogger({ service: 't', sink }),
      webhookUrl: 'https://hooks.example/x',
      fetch: fakeFetch,
    });
    expect(sink.lines[0]!.level).toBe('alert');
    expect(sink.lines[0]!.line).toContain('alert.server_error_spike');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0]!.body).text).toContain('30 server errors');
  });

  it('logs a failed post instead of throwing', async () => {
    const sink = memorySink();
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(
      deliverAlerts(alerts, {
        logger: createLogger({ service: 't', sink }),
        webhookUrl: 'https://hooks.example/x',
        fetch: failing,
      }),
    ).resolves.toBeUndefined();
    expect(sink.lines.some((l) => l.line.includes('alert.webhook_failed'))).toBe(true);
  });

  it('does nothing without alerts', async () => {
    const sink = memorySink();
    await deliverAlerts([], { logger: createLogger({ service: 't', sink }) });
    expect(sink.lines).toHaveLength(0);
  });
});
