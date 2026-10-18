/**
 * Raw reads and writes for operations data (BB-39): metered AI and speech calls, rate counters
 * and the story bank fallback. The rules (limits, budgets, alert thresholds) live in
 * packages/observability. Nothing here decides what a number means.
 */
import { and, eq, gte, lt, notInArray, sql } from 'drizzle-orm';
import type { Db, Story } from './queries';
import { aiCalls, rateCounters, stories } from './schema';

export type NewAiCall = typeof aiCalls.$inferInsert;
export type AiCallKind = (typeof aiCalls.$inferSelect)['kind'];

export async function insertAiCall(db: Db, values: NewAiCall): Promise<void> {
  await db.insert(aiCalls).values(values);
}

/** Links the calls of one generation run to the story it produced, for cost per story. */
export async function attachCallsToStory(db: Db, runId: string, storyId: string): Promise<void> {
  await db.update(aiCalls).set({ storyId }).where(eq(aiCalls.runId, runId));
}

/**
 * Total cost in US dollars since `since`, for everyone or for one learner. A call with no
 * recorded cost (a failed call, or speech with no price set) counts as `unknownCallUsd`, so
 * missing prices cannot hide spend from the daily cap. Rate limited calls never reached a
 * provider and count as nothing.
 */
export async function sumCostSince(
  db: Db,
  since: Date,
  learnerUserId?: string,
  unknownCallUsd = 0,
): Promise<number> {
  const where = learnerUserId
    ? and(gte(aiCalls.at, since), eq(aiCalls.learnerUserId, learnerUserId))
    : gte(aiCalls.at, since);
  const [row] = await db
    .select({
      total: sql<number>`(coalesce(sum(${aiCalls.costUsd}), 0) + ${unknownCallUsd}::float8 * count(*) filter (where ${aiCalls.costUsd} is null and ${aiCalls.outcome} <> 'limited'))::float8`,
    })
    .from(aiCalls)
    .where(where);
  return Number(row?.total ?? 0);
}

export async function costOfStory(db: Db, storyId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${aiCalls.costUsd}), 0)::float8` })
    .from(aiCalls)
    .where(eq(aiCalls.storyId, storyId));
  return Number(row?.total ?? 0);
}

/** Calls and failed calls of one kind since `since`. Failed means error or timeout. */
export async function callOutcomesSince(
  db: Db,
  kind: AiCallKind,
  since: Date,
): Promise<{ calls: number; failures: number }> {
  const [row] = await db
    .select({
      calls: sql<number>`count(*)::int`,
      failures: sql<number>`count(*) filter (where ${aiCalls.outcome} in ('error', 'timeout'))::int`,
    })
    .from(aiCalls)
    .where(and(eq(aiCalls.kind, kind), gte(aiCalls.at, since)));
  return { calls: Number(row?.calls ?? 0), failures: Number(row?.failures ?? 0) };
}

export interface CostReportRow {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  /** Null for calls with no learner, such as story bank pre-generation. */
  learnerUserId: string | null;
  kind: AiCallKind;
  calls: number;
  failures: number;
  costUsd: number;
  avgLatencyMs: number;
}

/**
 * Cost per learner per day and per kind, for calls in [from, to). Days are counted in local time
 * at `utcOffsetHours` (8 for the Philippines).
 */
export async function costReport(
  db: Db,
  from: Date,
  to: Date,
  utcOffsetHours: number,
): Promise<CostReportRow[]> {
  // Inlined rather than bound so GROUP BY sees the same expression as SELECT. It is an integer.
  const offset = sql.raw(`interval '${Math.trunc(utcOffsetHours)} hours'`);
  const day = sql<string>`to_char((${aiCalls.at} at time zone 'UTC') + ${offset}, 'YYYY-MM-DD')`;
  const rows = await db
    .select({
      day,
      learnerUserId: aiCalls.learnerUserId,
      kind: aiCalls.kind,
      calls: sql<number>`count(*)::int`,
      failures: sql<number>`count(*) filter (where ${aiCalls.outcome} in ('error', 'timeout'))::int`,
      costUsd: sql<number>`coalesce(sum(${aiCalls.costUsd}), 0)::float8`,
      avgLatencyMs: sql<number>`round(avg(${aiCalls.latencyMs}))::int`,
    })
    .from(aiCalls)
    .where(and(gte(aiCalls.at, from), lt(aiCalls.at, to)))
    .groupBy(day, aiCalls.learnerUserId, aiCalls.kind)
    .orderBy(day, aiCalls.learnerUserId, aiCalls.kind);
  return rows.map((r) => ({
    ...r,
    calls: Number(r.calls),
    failures: Number(r.failures),
    costUsd: Number(r.costUsd),
    avgLatencyMs: Number(r.avgLatencyMs),
  }));
}

/**
 * Adds one to a fixed-window counter and returns the new count. A single upsert, so two requests
 * at once can never both read the old value.
 */
export async function incrementCounter(
  db: Db,
  key: string,
  windowStart: Date,
  expiresAt: Date,
): Promise<number> {
  const [row] = await db
    .insert(rateCounters)
    .values({ key, windowStart, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: [rateCounters.key, rateCounters.windowStart],
      set: { count: sql`${rateCounters.count} + 1` },
    })
    .returning({ count: rateCounters.count });
  return row!.count;
}

/** The highest single-window count for `key` among windows starting at or after `since`. */
export async function maxCounterSince(db: Db, key: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ peak: sql<number>`coalesce(max(${rateCounters.count}), 0)::int` })
    .from(rateCounters)
    .where(and(eq(rateCounters.key, key), gte(rateCounters.windowStart, since)));
  return Number(row?.peak ?? 0);
}

export async function readCounter(db: Db, key: string, windowStart: Date): Promise<number> {
  const [row] = await db
    .select({ count: rateCounters.count })
    .from(rateCounters)
    .where(and(eq(rateCounters.key, key), eq(rateCounters.windowStart, windowStart)));
  return row?.count ?? 0;
}

/** Removes expired counters and call rows older than `keepCallsBefore`. */
export async function pruneOps(db: Db, now: Date, keepCallsBefore: Date): Promise<void> {
  await db.delete(rateCounters).where(lt(rateCounters.expiresAt, now));
  await db.delete(aiCalls).where(lt(aiCalls.at, keepCallsBefore));
}

/**
 * A random story bank story at this level, skipping `excludeIds` (stories the learner has read,
 * fetched by the caller through the authorization layer). Undefined when the bank is empty.
 */
export async function pickBankStory(
  db: Db,
  level: number,
  excludeIds: string[] = [],
): Promise<Story | undefined> {
  const conditions = [eq(stories.source, 'bank'), eq(stories.level, level)];
  if (excludeIds.length > 0) conditions.push(notInArray(stories.id, excludeIds));
  const [row] = await db
    .select()
    .from(stories)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(1);
  return row;
}
