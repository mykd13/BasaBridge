/**
 * The real dependencies for the operations routes (BB-39). Kept apart from handlers.ts so tests
 * of the handlers never open a database connection.
 */
import {
  BUDGET_UTC_OFFSET_HOURS,
  ERROR_BUCKET_SECONDS,
  ERROR_COUNTER_KEYS,
  budgetDayStart,
  budgetFromEnv,
  deliverAlerts,
  thresholdsFromEnv,
  windowStart,
} from '@basabridge/observability';
import {
  callOutcomesSince,
  costReport,
  maxCounterSince,
  pruneOps,
  sumCostSince,
} from '@basabridge/db';
import { getDb } from './db';
import {
  createAlertCheckHandler,
  createClientErrorHandler,
  createCostReportHandler,
} from './handlers';
import { countError, enforceLimit, log } from './index';
import { hasBearer } from './request';

/** ai_calls rows are kept this long for cost reports, then deleted. */
const KEEP_CALLS_DAYS = 180;

export const clientErrorHandler = createClientErrorHandler({
  log: log.child({ origin: 'browser' }),
  allow: async (ip) => (await enforceLimit('client_errors_per_ip', ip)).allowed,
  countError: () => countError('client'),
});

const thresholds = thresholdsFromEnv(process.env);

export const alertCheckHandler = createAlertCheckHandler({
  log,
  authorized: (request) => hasBearer(request, process.env.CRON_SECRET),
  thresholds,
  gather: async (now) => {
    const db = getDb();
    const budget = budgetFromEnv(process.env);
    // Look back over the whole span since the last check (the cron interval), so a spike at any
    // time in it is seen. The busiest 5 minute bucket is the value compared with the threshold.
    const lookback = new Date(now.getTime() - thresholds.lookbackMinutes * 60_000);
    const errorsSince = windowStart(lookback, ERROR_BUCKET_SECONDS);
    const speechSince = new Date(
      now.getTime() - Math.max(thresholds.speechWindowMinutes, thresholds.lookbackMinutes) * 60_000,
    );
    const [serverErrors, clientErrors, spentTodayUsd, speech] = await Promise.all([
      maxCounterSince(db, ERROR_COUNTER_KEYS.server, errorsSince),
      maxCounterSince(db, ERROR_COUNTER_KEYS.client, errorsSince),
      sumCostSince(db, budgetDayStart(now), undefined, budget.unknownCallUsd),
      callOutcomesSince(db, 'speech', speechSince),
    ]);
    return {
      serverErrors,
      clientErrors,
      spentTodayUsd,
      globalDailyUsd: budget.globalDailyUsd,
      alertShare: budget.alertShare,
      speechCalls: speech.calls,
      speechFailures: speech.failures,
    };
  },
  deliver: (alerts) =>
    deliverAlerts(alerts, { logger: log, webhookUrl: process.env.ALERT_WEBHOOK_URL }),
  prune: (now) =>
    pruneOps(getDb(), now, new Date(now.getTime() - KEEP_CALLS_DAYS * 24 * 3600 * 1000)),
});

export const costReportHandler = createCostReportHandler({
  authorized: (request) => hasBearer(request, process.env.OPS_TOKEN),
  report: (from, to) => costReport(getDb(), from, to, BUDGET_UTC_OFFSET_HOURS),
});
