import {
  createLogger,
  DEFAULT_THRESHOLDS,
  memorySink,
  type Alert,
} from '@basabridge/observability';
import type { CostReportRow } from '@basabridge/db';
import { describe, expect, it } from 'vitest';
import {
  CLIENT_ERROR_MAX_BYTES,
  createAlertCheckHandler,
  createClientErrorHandler,
  createCostReportHandler,
  parseClientError,
} from './handlers';
import { clientIp, clientSubject, hasBearer } from './request';

const SECRET = 'a-long-enough-test-secret';
const authed = (url: string) =>
  new Request(url, { headers: { authorization: `Bearer ${SECRET}` } });

describe('hasBearer', () => {
  it('accepts only the exact secret', () => {
    expect(hasBearer(authed('http://x/'), SECRET)).toBe(true);
    expect(hasBearer(new Request('http://x/'), SECRET)).toBe(false);
    expect(
      hasBearer(new Request('http://x/', { headers: { authorization: 'Bearer nope' } }), SECRET),
    ).toBe(false);
  });

  it('refuses everyone when the secret is unset or short', () => {
    expect(hasBearer(authed('http://x/'), undefined)).toBe(false);
    expect(
      hasBearer(new Request('http://x/', { headers: { authorization: 'Bearer short' } }), 'short'),
    ).toBe(false);
  });
});

describe('clientIp', () => {
  it('takes the first forwarded address', () => {
    const r = new Request('http://x/', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } });
    expect(clientIp(r)).toBe('203.0.113.7');
  });
});

describe('client error reports', () => {
  function setup(allow: boolean | 'throws' = true) {
    const sink = memorySink();
    let counted = 0;
    const handler = createClientErrorHandler({
      log: createLogger({ service: 't', sink }),
      allow: async () => {
        if (allow === 'throws') throw new Error('store down');
        return allow;
      },
      countError: async () => {
        counted += 1;
      },
    });
    return { sink, handler, counted: () => counted };
  }
  const post = (body: string) =>
    new Request('http://x/api/client-errors', { method: 'POST', body });

  it('logs a valid report without the browser message and counts it', async () => {
    const s = setup();
    const res = await s.handler(
      post(
        JSON.stringify({
          kind: 'error',
          errorClass: 'TypeError',
          message: 'Maria Santos read: the quick brown fox',
          stack: 'TypeError: Maria Santos read\n    at Foo (https://x/_next/a.js?token=abc:1:2)',
          route: '/read/:id',
          username: 'maria_s',
        }),
      ),
    );
    expect(res.status).toBe(204);
    expect(s.counted()).toBe(1);
    const line = s.sink.lines[0]!.line;
    expect(line).toContain('client.error');
    expect(line).toContain('TypeError');
    expect(line).toContain('at Foo');
    expect(line).not.toContain('Maria');
    expect(line).not.toContain('maria');
    expect(line).not.toContain('token=abc');
  });

  it('keeps only the class, frames and route, and drops the message', () => {
    const r = parseClientError(
      JSON.stringify({ kind: 'error', errorClass: 'bad name!', message: 'x', answer: 'B' }),
    );
    expect(r).toEqual({
      kind: 'error',
      errorClass: 'Error',
      stack: null,
      source: null,
      route: null,
    });
  });

  it('refuses a report from another origin', async () => {
    const body = JSON.stringify({ kind: 'error', errorClass: 'Error' });
    const make = (origin: string) =>
      new Request('http://x/api/client-errors', {
        method: 'POST',
        body,
        headers: { origin, host: 'x' },
      });
    expect((await setup().handler(make('https://evil.example'))).status).toBe(403);
    expect((await setup().handler(make('https://x'))).status).toBe(204);
  });

  it('fails closed when the limiter store is down', async () => {
    const s = setup('throws');
    const res = await s.handler(post(JSON.stringify({ kind: 'error', errorClass: 'Error' })));
    expect(res.status).toBe(503);
    expect(s.counted()).toBe(0);
    expect(s.sink.lines.some((l) => l.line.includes('"client.error"'))).toBe(false);
  });

  it('splits callers with no address by user agent', () => {
    const a = new Request('http://x/', { headers: { 'user-agent': 'A' } });
    const b = new Request('http://x/', { headers: { 'user-agent': 'B' } });
    expect(clientSubject(a)).not.toBe(clientSubject(b));
  });

  it('refuses bad, oversized and over-limit reports', async () => {
    expect((await setup().handler(post('not json'))).status).toBe(400);
    expect(
      (await setup().handler(post(JSON.stringify({ kind: 'x', errorClass: 'y' })))).status,
    ).toBe(400);
    const big = JSON.stringify({ kind: 'error', errorClass: 'x'.repeat(CLIENT_ERROR_MAX_BYTES) });
    expect((await setup().handler(post(big))).status).toBe(413);
    const limited = setup(false);
    expect(
      (await limited.handler(post(JSON.stringify({ kind: 'error', errorClass: 'Error' })))).status,
    ).toBe(429);
    expect(limited.counted()).toBe(0);
  });
});

describe('alert check', () => {
  function setup() {
    const delivered: Alert[][] = [];
    let pruned = 0;
    const handler = createAlertCheckHandler({
      log: createLogger({ service: 't', sink: memorySink() }),
      authorized: (r) => hasBearer(r, SECRET),
      thresholds: DEFAULT_THRESHOLDS,
      gather: async () => ({
        serverErrors: 40,
        clientErrors: 0,
        spentTodayUsd: 0,
        globalDailyUsd: 10,
        alertShare: 0.8,
        speechCalls: 0,
        speechFailures: 0,
      }),
      deliver: async (a) => {
        delivered.push(a);
      },
      prune: async () => {
        pruned += 1;
      },
    });
    return { handler, delivered, pruned: () => pruned };
  }

  it('needs the cron secret', async () => {
    const s = setup();
    expect((await s.handler(new Request('http://x/api/cron/alerts'))).status).toBe(401);
    expect(s.delivered).toHaveLength(0);
  });

  it('evaluates, delivers and prunes', async () => {
    const s = setup();
    const res = await s.handler(authed('http://x/api/cron/alerts'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alerts: Alert[] };
    expect(body.alerts.map((a) => a.kind)).toEqual(['server_error_spike']);
    expect(s.delivered[0]).toHaveLength(1);
    expect(s.pruned()).toBe(1);
  });
});

describe('cost report', () => {
  const rows: CostReportRow[] = [
    {
      day: '2026-10-18',
      learnerUserId: 'L1',
      kind: 'story',
      calls: 2,
      failures: 0,
      costUsd: 0.3,
      avgLatencyMs: 900,
    },
    {
      day: '2026-10-18',
      learnerUserId: 'L1',
      kind: 'notes',
      calls: 1,
      failures: 1,
      costUsd: 0.1,
      avgLatencyMs: 200,
    },
    {
      day: '2026-10-18',
      learnerUserId: 'L2',
      kind: 'story',
      calls: 1,
      failures: 0,
      costUsd: 0.2,
      avgLatencyMs: 800,
    },
    {
      day: '2026-10-18',
      learnerUserId: null,
      kind: 'verifier',
      calls: 4,
      failures: 0,
      costUsd: 1,
      avgLatencyMs: 1200,
    },
  ];
  let asked: [Date, Date] | null = null;
  const handler = createCostReportHandler({
    authorized: (r) => hasBearer(r, SECRET),
    report: async (from, to) => {
      asked = [from, to];
      return rows;
    },
    // 20:00 UTC on the 17th is already the 18th in the Philippines.
    now: () => new Date('2026-10-17T20:00:00Z'),
  });

  it('needs the ops token', async () => {
    expect((await handler(new Request('http://x/api/ops/cost-report'))).status).toBe(401);
  });

  it('defaults to today in the Philippines and sums cost per learner per day', async () => {
    const res = await handler(authed('http://x/api/ops/cost-report'));
    expect(res.status).toBe(200);
    expect(asked![0].toISOString()).toBe('2026-10-17T16:00:00.000Z');
    expect(asked![1].toISOString()).toBe('2026-10-18T16:00:00.000Z');
    const body = (await res.json()) as {
      days: Record<string, { costUsd: number; learners: number; calls: number }>;
      costPerLearnerDay: { learnerDays: number; averageUsd: number; maxUsd: number };
    };
    expect(body.days['2026-10-18']).toMatchObject({ calls: 8, learners: 2 });
    expect(body.days['2026-10-18']!.costUsd).toBeCloseTo(1.6);
    expect(body.costPerLearnerDay.learnerDays).toBe(2);
    expect(body.costPerLearnerDay.averageUsd).toBeCloseTo(0.3);
    expect(body.costPerLearnerDay.maxUsd).toBeCloseTo(0.4);
  });

  it('rejects bad or too long ranges', async () => {
    for (const q of [
      '?from=yesterday',
      '?from=2026-02-30',
      '?from=2026-10-10&to=2026-10-01',
      '?from=2026-01-01&to=2026-03-01',
    ])
      expect((await handler(authed(`http://x/api/ops/cost-report${q}`))).status).toBe(400);
  });
});

describe('client error body limit and frames', () => {
  const handler = createClientErrorHandler({
    log: createLogger({ service: 't', sink: memorySink() }),
    allow: async () => true,
    countError: async () => {},
  });

  it('refuses a big body even with no content-length', async () => {
    const big = JSON.stringify({ kind: 'error', stack: 'x'.repeat(CLIENT_ERROR_MAX_BYTES * 2) });
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const req = new Request('http://x/api/client-errors', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect((await handler(req)).status).toBe(413);
  });

  it('keeps real frames and drops message lines that only look like frames', () => {
    const stack = [
      'Error: at the door: 5:30',
      '    at Foo (https://x/_next/a.js:10:5)',
      'bar@https://x/_next/b.js:3:4',
    ].join('\n');
    const r = parseClientError(JSON.stringify({ kind: 'error', stack }));
    expect(r?.stack).toBe('at Foo (https://x/_next/a.js:10:5)\nbar@https://x/_next/b.js:3:4');
  });
});
