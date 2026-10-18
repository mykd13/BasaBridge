# Observability, rate limits and AI cost budgets

This page covers BB-39: how we know when BasaBridge breaks, and how we stop it from costing too much.

The logic lives in `packages/observability`. The data lives in two tables in `packages/db` (`ai_calls` and `rate_counters`). The web app connects them in `apps/web/src/server/ops`.

## Logs

- Every server log line is one JSON object with `at`, `level`, `service`, `event` and fields. Vercel keeps them, and a log drain can filter on any field.
- Use `log` from `apps/web/src/server/ops`. Write a short dotted `event` such as `ai.call`, and put the details in fields.
- Every field goes through `redact` first. It removes names, usernames, emails, passwords, audio, transcripts, story text, questions, options and answers, even inside nested objects. It also replaces emails and bearer tokens found in free text.
- Never put learner content in the `event` name. The redactor checks fields only.

## Error tracking

- **Server:** `apps/web/src/instrumentation.ts` gets every uncaught error from routes, pages, server actions and middleware. It logs `request.error` with the route template (never the real path or query), the error class and the digest, and counts the error. The message and stack are never logged, because a validation or provider error can hold story text, a username or a transcript.
- **Browser:** `apps/web/src/instrumentation-client.ts` reports uncaught errors and rejected promises to `POST /api/client-errors`.
  - At most 5 reports leave one page load.
  - Ids in the path become `:id`.
  - Only the error class (`errorClass`, such as `TypeError`) and stack frames (lines ending in line and column) are sent. The browser's error message is never sent or logged, because it can hold text a learner typed or read. Frames lose their query strings.
  - The route refuses requests from another origin, caps the body at 8 KB (counted as it is read, so a missing content-length does not help), keeps only known fields and rate limits per network address (callers with no address are split by user agent). If the limit store is down it refuses the report (503) instead of logging it unmetered.
  - The route cannot require sign-in, because errors can happen before a learner signs in. The origin check and the rate limit are its guards.
- We use no third-party error service, so no new company receives data. Search the Vercel logs for `"level":"error"`.

## Metering AI and speech calls

Wrap every model, speech and text-to-speech call in `meter`:

```ts
import { gatewayCost } from '@basabridge/observability';
import { meter } from '@/server/ops';

const result = await meter(
  { kind: 'story', model: process.env.STORY_MODEL!, learnerUserId, runId },
  () => generateText({ model: process.env.STORY_MODEL!, prompt }),
  { cost: (r) => gatewayCost(r.providerMetadata) },
);
```

- Each call writes one `ai_calls` row and one `ai.call` log line. The row holds kind, model, outcome, latency, cost, learner id, story id and run id. It never holds a prompt, a reply, audio or a transcript.
- **Kinds:** `story`, `verifier`, `notes`, `speech`, `tts`.
- **Outcomes:** `ok`, `error`, `timeout`, `invalid` (the reply failed validation) and `limited`.
- **AI cost** comes from the AI Gateway: `providerMetadata.gateway.cost`, in US dollars.
- **Speech cost** is audio minutes times `SPEECH_USD_PER_MINUTE`. Use `speechCost` for it.
- **Cost per story:** give all calls of one generation (generator, verifier, retries) the same `runId`. Once the story is saved, call `attachCallsToStory(db, runId, storyId)`. Then `costOfStory` returns the total.
- If writing the row fails, the error is logged and the call still returns.

## Cost report

`GET /api/ops/cost-report?from=YYYY-MM-DD&to=YYYY-MM-DD` with `Authorization: Bearer $OPS_TOKEN`.

- Days are Philippine days and inclusive. Both dates default to today. The range is at most 31 days.
- The response has:
  - `days`: cost, calls, failures and the number of learners per day
  - `costPerLearnerDay`: the average and the highest cost for one learner on one day
  - `rows`: day, learner id, kind, calls, failures, cost and average latency
- Learners appear by id only.
- This is an operator endpoint behind `OPS_TOKEN`. It reads `ai_calls` through `costReport` in `packages/db` and returns totals and learner ids, with no names, text or audio. It is not a learner-facing read. When the authorization layer (BB-10) lands, route `costReport` through it.

```bash
curl -H "Authorization: Bearer $OPS_TOKEN" "https://<deployment>/api/ops/cost-report?from=2026-10-01&to=2026-10-07"
```

`ai_calls` rows older than 180 days are deleted by the alert check.

## Rate limits

`enforceLimit(name, subject)` counts one use in a fixed window and returns whether it is allowed. Every refusal logs `limit.hit`. Subjects are stored as a keyed hash (HMAC with `AUTH_SECRET`), never as a raw username or IP address.

| Policy                 | Subject              | Default       |
| ---------------------- | -------------------- | ------------- |
| `story_per_learner`    | learner id           | 20 per hour   |
| `story_global`         | `global`             | 300 per hour  |
| `speech_per_learner`   | learner id           | 60 per hour   |
| `speech_global`        | `global`             | 3000 per hour |
| `tts_per_learner`      | learner id           | 200 per hour  |
| `sign_in_per_ip`       | network address      | 30 per 15 min |
| `sign_in_per_account`  | typed username/email | 10 per 15 min |
| `client_errors_per_ip` | network address      | 30 per 5 min  |

Override any policy with `RATE_LIMIT_<POLICY>=<limit>/<seconds>`, for example `RATE_LIMIT_SIGN_IN_PER_IP=20/900`.

## Daily budget

- Call `storySourceFor(learnerUserId)` before generating a story. It returns `generate`, or `bank` with a reason:
  - `global_budget`: today's total spend reached `AI_DAILY_BUDGET_USD`
  - `learner_budget`: this learner's spend reached `AI_LEARNER_DAILY_BUDGET_USD`
  - `rate_limit`: a story generation limit was hit
- On `bank`, serve `pickBankStory(db, level, excludeIds)`. If that is empty too, fail visibly. `pickBankStory` reads the shared story bank only (`source = 'bank'`), not learner data. The caller fetches the learner's read stories through the authorization layer (BB-10) and passes them as `excludeIds`.
- A call with no recorded cost (a failed call, or speech with no `SPEECH_USD_PER_MINUTE`) counts as `AI_UNKNOWN_CALL_USD` (default 0.01) toward both caps, so missing prices cannot hide spend. Rate limited calls count as nothing.
- The check reads the spend, then lets the call go. Requests that arrive at the same moment can overshoot a cap slightly. The story rate limits keep that overshoot small.
- `budgetFromEnv` also returns `learnerNewDailyUsd` (`AI_NEW_LEARNER_DAILY_BUDGET_USD`) for the BB-63 caps in `apps/web/src/server/limits/caps.ts`, which decide the tier and the notice. `storySourceFor` is the BB-39 check for story generation and does not look at tiers.
- A database error also returns `bank`, so an outage can never run up cost.
- The budget day starts at midnight in the Philippines.
- BB-63 adds the learner-facing "come back tomorrow" message on top of `learner_budget`.

## Alerts

Vercel cron calls `GET /api/cron/alerts` with `Authorization: Bearer $CRON_SECRET`. It checks:

| Alert                | Fires when                                                           | Setting                         |
| -------------------- | -------------------------------------------------------------------- | ------------------------------- |
| `server_error_spike` | 25 or more server errors in one 5 minute bucket                      | `ALERT_SERVER_ERRORS_PER_5_MIN` |
| `client_error_spike` | 50 or more browser errors in one 5 minute bucket                     | `ALERT_CLIENT_ERRORS_PER_5_MIN` |
| `high_cost`          | today's spend passes `AI_BUDGET_ALERT_SHARE` of the daily budget     | `AI_BUDGET_ALERT_SHARE`         |
| `budget_exhausted`   | today's spend reaches the daily budget                               | `AI_DAILY_BUDGET_USD`           |
| `speech_failures`    | 20% or more of at least 10 speech calls failed in the look-back span | `ALERT_SPEECH_FAILURE_RATE`     |

- Each alert writes an `alert` level log line with event `alert.<kind>`.
- When `ALERT_WEBHOOK_URL` is set, all alerts from one check are posted together as `{ text, alerts }`. Slack-style incoming webhooks accept this.
- Getting an alert to a person on call is BB-67.

## Setup on Vercel

Set `CRON_SECRET`, `OPS_TOKEN`, `AI_DAILY_BUDGET_USD`, `AI_LEARNER_DAILY_BUDGET_USD` and, if wanted, `ALERT_WEBHOOK_URL` in every environment. `apps/web/vercel.json` runs the alert check once a day at 15:00 UTC (23:00 in the Philippines), which Vercel Hobby accepts and which puts the check at the end of the budget day. Each check looks back over `ALERT_LOOKBACK_MINUTES` (default 1440, one day, matching the daily schedule). Spike alerts compare the busiest 5 minute bucket in that span with the threshold, and the speech check covers the same span, so a spike at any time of day is seen. On a Vercel Pro plan, set the schedule to `*/5 * * * *` and `ALERT_LOOKBACK_MINUTES=5` to be told within minutes. A schedule more often than daily makes a Hobby deploy fail.
