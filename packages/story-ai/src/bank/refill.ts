import { MAX_LEVEL, MIN_LEVEL } from '@basabridge/levels';
import { BANK_DEFAULTS } from './config';
import { logRecord, timedRun, toRecord } from './record';
import type { Clock, Logger, StoryBankStore, StoryPipeline } from './types';

export interface RefillJob {
  level: number;
  topic: string;
  have: number;
}

export function allLevels(): number[] {
  return Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);
}

/**
 * One job per missing story. Lowest stock first, then level ascending, then topic order,
 * capped at maxJobs.
 */
export function planRefill(
  stock: ReadonlyMap<number, ReadonlyMap<string, number>>,
  opts: {
    levels: readonly number[];
    topics: readonly string[];
    targetPerTopic?: number;
    maxJobs?: number;
  },
): RefillJob[] {
  const target = opts.targetPerTopic ?? BANK_DEFAULTS.targetPerTopic;
  const maxJobs = opts.maxJobs ?? BANK_DEFAULTS.maxJobsPerRun;
  const cells: (RefillJob & { order: number })[] = [];
  for (const level of opts.levels) {
    opts.topics.forEach((topic, order) => {
      const have = stock.get(level)?.get(topic) ?? 0;
      if (have < target) cells.push({ level, topic, have, order });
    });
  }
  cells.sort((a, b) => a.have - b.have || a.level - b.level || a.order - b.order);

  const jobs: RefillJob[] = [];
  for (const { level, topic, have } of cells) {
    for (let n = have; n < target && jobs.length < maxJobs; n++) {
      jobs.push({ level, topic, have });
    }
    if (jobs.length >= maxJobs) break;
  }
  return jobs;
}

export interface RefillDeps {
  store: StoryBankStore;
  pipeline: StoryPipeline;
  clock: Clock;
  log: Logger;
}

export interface RefillSummary {
  planned: number;
  stored: number;
  rejected: number;
  failed: number;
  costUsd: number;
  latencyMs: number;
}

/** Top up the stock. Jobs run one after another, and a failing job never stops the run. */
export async function runRefill(
  deps: RefillDeps,
  opts: {
    levels?: number[];
    topics: readonly string[];
    targetPerTopic?: number;
    maxJobs?: number;
  },
): Promise<RefillSummary> {
  const levels = opts.levels ?? allLevels();
  const stock = new Map<number, Map<string, number>>();
  for (const level of levels) stock.set(level, await deps.store.stockByTopic(level));

  const jobs = planRefill(stock, { ...opts, levels });
  const summary: RefillSummary = {
    planned: jobs.length,
    stored: 0,
    rejected: 0,
    failed: 0,
    costUsd: 0,
    latencyMs: 0,
  };

  for (const job of jobs) {
    // Focus stays null for bank stock: focused stories are generated live for now.
    // TODO(BB-18 Drizzle store): pass the stored titles at this level once the store can list them.
    const input = { level: job.level, topic: job.topic, focus: null, recentTitles: [] };
    const { outcome, latencyMs } = await timedRun(deps.pipeline, input, deps.clock);
    const record = toRecord(input, outcome, latencyMs, 'refill');
    if (outcome.ok) {
      try {
        await deps.store.save({ level: job.level, topic: job.topic, story: outcome.story });
      } catch {
        // Treat a failed save as a failed job. The story is dropped and the run goes on.
        record.outcome = 'failed';
        record.errorKind = 'config';
      }
    }
    logRecord(deps.log, record);
    summary[record.outcome] += 1;
    summary.costUsd += outcome.usage.costUsd ?? 0;
    summary.latencyMs += latencyMs;
  }
  return summary;
}
