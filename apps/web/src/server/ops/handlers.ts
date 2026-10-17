/**
 * Route logic for operations endpoints (BB-39), built from injected dependencies so it can be
 * tested without a database. The route files in src/app/api wire in the real ones.
 */
import {
  BUDGET_UTC_OFFSET_HOURS,
  evaluateAlerts,
  type Alert,
  type AlertInputs,
  type AlertThresholds,
  type Logger,
} from '@basabridge/observability';
import type { CostReportRow } from '@basabridge/db';
import { clientIp } from './request';

export const CLIENT_ERROR_MAX_BYTES = 8 * 1024;

export interface ClientErrorDeps {
  log: Logger;
  /** Counts one report from this address. False when over the limit. */
  allow(ip: string): Promise<boolean>;
  countError(): Promise<void>;
}

/** POST /api/client-errors: one browser error report, logged after redaction. */
export function createClientErrorHandler(deps: ClientErrorDeps) {
  return async (request: Request): Promise<Response> => {
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > CLIENT_ERROR_MAX_BYTES) return new Response(null, { status: 413 });
    const raw = await request.text();
    if (raw.length > CLIENT_ERROR_MAX_BYTES) return new Response(null, { status: 413 });

    const report = parseClientError(raw);
    if (!report) return new Response(null, { status: 400 });

    let allowed = true;
    try {
      allowed = await deps.allow(clientIp(request));
    } catch (err) {
      deps.log.warn('client.error.limit_unavailable', { error: err });
    }
    if (!allowed) return new Response(null, { status: 429 });

    deps.log.warn('client.error', { ...report });
    try {
      await deps.countError();
    } catch (err) {
      deps.log.warn('client.error.count_failed', { error: err });
    }
    return new Response(null, { status: 204 });
  };
}

export interface ClientErrorReport {
  kind: 'error' | 'unhandledrejection';
  message: string;
  stack: string | null;
  source: string | null;
  route: string | null;
}

/** Accepts only the fields the browser reporter sends. Anything else is dropped. */
export function parseClientError(raw: string): ClientErrorReport | null {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  const b = body as Record<string, unknown> | null;
  if (!b || (b.kind !== 'error' && b.kind !== 'unhandledrejection')) return null;
  if (typeof b.message !== 'string') return null;
  const opt = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
  return {
    kind: b.kind,
    message: b.message,
    stack: opt(b.stack),
    source: opt(b.source),
    route: opt(b.route),
  };
}

export interface AlertCheckDeps {
  log: Logger;
  authorized(request: Request): boolean;
  gather(now: Date): Promise<AlertInputs>;
  thresholds: AlertThresholds;
  deliver(alerts: Alert[]): Promise<void>;
  prune(now: Date): Promise<void>;
  now?: () => Date;
}

/** GET /api/cron/alerts: run by Vercel cron with CRON_SECRET. */
export function createAlertCheckHandler(deps: AlertCheckDeps) {
  return async (request: Request): Promise<Response> => {
    if (!deps.authorized(request)) return new Response(null, { status: 401 });
    const now = (deps.now ?? (() => new Date()))();
    const inputs = await deps.gather(now);
    const alerts = evaluateAlerts(inputs, deps.thresholds);
    await deps.deliver(alerts);
    try {
      await deps.prune(now);
    } catch (err) {
      deps.log.warn('ops.prune_failed', { error: err });
    }
    deps.log.info('ops.alert_check', { alerts: alerts.length, ...inputs });
    return Response.json({ alerts });
  };
}

export const REPORT_MAX_DAYS = 31;

export interface CostReportDeps {
  authorized(request: Request): boolean;
  report(from: Date, to: Date): Promise<CostReportRow[]>;
  now?: () => Date;
}

/**
 * GET /api/ops/cost-report?from=YYYY-MM-DD&to=YYYY-MM-DD with OPS_TOKEN. Days are local to the
 * Philippines and inclusive. Both default to today. Learners appear by id only.
 */
export function createCostReportHandler(deps: CostReportDeps) {
  return async (request: Request): Promise<Response> => {
    if (!deps.authorized(request)) return new Response(null, { status: 401 });
    const url = new URL(request.url);
    const today = localDay((deps.now ?? (() => new Date()))());
    const fromDay = url.searchParams.get('from') ?? today;
    const toDay = url.searchParams.get('to') ?? fromDay;
    const from = dayStartUtc(fromDay);
    const toStart = dayStartUtc(toDay);
    if (!from || !toStart || toStart < from)
      return Response.json(
        { error: 'Use from and to as YYYY-MM-DD, with from before to.' },
        { status: 400 },
      );
    const to = new Date(toStart.getTime() + DAY_MS);
    if ((to.getTime() - from.getTime()) / DAY_MS > REPORT_MAX_DAYS)
      return Response.json({ error: `At most ${REPORT_MAX_DAYS} days.` }, { status: 400 });

    const rows = await deps.report(from, to);
    const byDay: Record<
      string,
      { costUsd: number; calls: number; failures: number; learners: number }
    > = {};
    const learnersByDay = new Map<string, Set<string>>();
    for (const r of rows) {
      const d = (byDay[r.day] ??= { costUsd: 0, calls: 0, failures: 0, learners: 0 });
      d.costUsd += r.costUsd;
      d.calls += r.calls;
      d.failures += r.failures;
      if (r.learnerUserId) {
        const set = learnersByDay.get(r.day) ?? new Set<string>();
        set.add(r.learnerUserId);
        learnersByDay.set(r.day, set);
      }
    }
    for (const [day, set] of learnersByDay) byDay[day]!.learners = set.size;
    const learnerRows = rows.filter((r) => r.learnerUserId !== null);
    const perLearnerDay = new Map<string, number>();
    for (const r of learnerRows) {
      const k = `${r.day}|${r.learnerUserId}`;
      perLearnerDay.set(k, (perLearnerDay.get(k) ?? 0) + r.costUsd);
    }
    const costs = [...perLearnerDay.values()];
    return Response.json({
      from: fromDay,
      to: toDay,
      days: byDay,
      costPerLearnerDay: {
        learnerDays: costs.length,
        averageUsd: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0,
        maxUsd: costs.length ? Math.max(...costs) : 0,
      },
      rows,
    });
  };
}

const DAY_MS = 24 * 3600 * 1000;
const OFFSET_MS = BUDGET_UTC_OFFSET_HOURS * 3600 * 1000;

function localDay(now: Date): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

function dayStartUtc(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== day) return null;
  return new Date(t - OFFSET_MS);
}
