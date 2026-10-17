/**
 * Alerts (BB-39): error spikes, high AI cost and speech provider failures. A scheduled check
 * gathers the numbers, `evaluateAlerts` decides, and `deliverAlerts` writes an `alert` log line
 * and posts to a webhook when one is set. Routing alerts to a person is BB-67.
 */
import { positiveNumber, type Env } from './env';
import type { Logger } from './log';

/** Errors are counted in buckets of this many seconds, keyed `errors:server` and `errors:client`. */
export const ERROR_BUCKET_SECONDS = 300;
export const ERROR_COUNTER_KEYS = { server: 'errors:server', client: 'errors:client' } as const;

export interface AlertThresholds {
  /** Server errors in one bucket that count as a spike. */
  serverErrorsPerBucket: number;
  /** Browser errors in one bucket that count as a spike. */
  clientErrorsPerBucket: number;
  /** Failed share of speech calls in the look-back window, 0..1. */
  speechFailureRate: number;
  /** Fewer speech calls than this is too little to judge. */
  speechMinCalls: number;
  /** Minutes of speech calls to look back over. */
  speechWindowMinutes: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  serverErrorsPerBucket: 25,
  clientErrorsPerBucket: 50,
  speechFailureRate: 0.2,
  speechMinCalls: 10,
  speechWindowMinutes: 15,
};

export function thresholdsFromEnv(env: Env): AlertThresholds {
  const rate = positiveNumber(
    env,
    'ALERT_SPEECH_FAILURE_RATE',
    DEFAULT_THRESHOLDS.speechFailureRate,
  );
  return {
    serverErrorsPerBucket: positiveNumber(
      env,
      'ALERT_SERVER_ERRORS_PER_5_MIN',
      DEFAULT_THRESHOLDS.serverErrorsPerBucket,
    ),
    clientErrorsPerBucket: positiveNumber(
      env,
      'ALERT_CLIENT_ERRORS_PER_5_MIN',
      DEFAULT_THRESHOLDS.clientErrorsPerBucket,
    ),
    speechFailureRate: rate <= 1 ? rate : DEFAULT_THRESHOLDS.speechFailureRate,
    speechMinCalls: DEFAULT_THRESHOLDS.speechMinCalls,
    speechWindowMinutes: DEFAULT_THRESHOLDS.speechWindowMinutes,
  };
}

export interface AlertInputs {
  /** Errors in the last complete bucket. */
  serverErrors: number;
  clientErrors: number;
  spentTodayUsd: number;
  globalDailyUsd: number;
  /** Share of the daily budget that raises the high cost alert, 0..1. */
  alertShare: number;
  speechCalls: number;
  speechFailures: number;
}

export type AlertKind =
  | 'server_error_spike'
  | 'client_error_spike'
  | 'high_cost'
  | 'budget_exhausted'
  | 'speech_failures';

export interface Alert {
  kind: AlertKind;
  severity: 'warning' | 'critical';
  summary: string;
  value: number;
  threshold: number;
}

export function evaluateAlerts(input: AlertInputs, t: AlertThresholds): Alert[] {
  const alerts: Alert[] = [];
  if (input.serverErrors >= t.serverErrorsPerBucket)
    alerts.push({
      kind: 'server_error_spike',
      severity: 'critical',
      summary: `${input.serverErrors} server errors in 5 minutes.`,
      value: input.serverErrors,
      threshold: t.serverErrorsPerBucket,
    });
  if (input.clientErrors >= t.clientErrorsPerBucket)
    alerts.push({
      kind: 'client_error_spike',
      severity: 'warning',
      summary: `${input.clientErrors} browser errors in 5 minutes.`,
      value: input.clientErrors,
      threshold: t.clientErrorsPerBucket,
    });
  if (input.spentTodayUsd >= input.globalDailyUsd)
    alerts.push({
      kind: 'budget_exhausted',
      severity: 'critical',
      summary: `Daily AI budget reached: $${input.spentTodayUsd.toFixed(2)} of $${input.globalDailyUsd.toFixed(2)}. New stories come from the bank.`,
      value: input.spentTodayUsd,
      threshold: input.globalDailyUsd,
    });
  else if (input.spentTodayUsd >= input.globalDailyUsd * input.alertShare)
    alerts.push({
      kind: 'high_cost',
      severity: 'warning',
      summary: `AI spend today is $${input.spentTodayUsd.toFixed(2)}, over ${Math.round(input.alertShare * 100)}% of the $${input.globalDailyUsd.toFixed(2)} budget.`,
      value: input.spentTodayUsd,
      threshold: input.globalDailyUsd * input.alertShare,
    });
  if (input.speechCalls >= t.speechMinCalls) {
    const rate = input.speechFailures / input.speechCalls;
    if (rate >= t.speechFailureRate)
      alerts.push({
        kind: 'speech_failures',
        severity: 'critical',
        summary: `${input.speechFailures} of ${input.speechCalls} speech calls failed in ${t.speechWindowMinutes} minutes.`,
        value: rate,
        threshold: t.speechFailureRate,
      });
  }
  return alerts;
}

export interface DeliverOptions {
  logger: Logger;
  /** ALERT_WEBHOOK_URL. Receives `{ text, alerts }` as JSON, which Slack-style webhooks accept. */
  webhookUrl?: string | null;
  fetch?: typeof fetch;
}

/** Logs every alert, then posts them together. A failed post is logged and never thrown. */
export async function deliverAlerts(alerts: Alert[], options: DeliverOptions): Promise<void> {
  if (alerts.length === 0) return;
  for (const a of alerts) options.logger.alert(`alert.${a.kind}`, { ...a });
  const url = options.webhookUrl?.trim();
  if (!url) return;
  const doFetch = options.fetch ?? fetch;
  const text = alerts.map((a) => `[${a.severity}] ${a.summary}`).join('\n');
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `BasaBridge alerts\n${text}`, alerts }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) options.logger.error('alert.webhook_failed', { status: res.status });
  } catch (err) {
    options.logger.error('alert.webhook_failed', { error: err });
  }
}
