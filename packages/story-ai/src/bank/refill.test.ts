import { MAX_LEVEL, MIN_LEVEL } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { allLevels, planRefill, runRefill } from './refill';
import { captureLog, fakePipeline, fixedClock, memoryStore, storyFixture } from './testing';
import type { BankEntry, PipelineOutcome } from './types';

const topics = ['animals', 'sea', 'space'];

const stockOf = (rows: [number, string, number][]) => {
  const stock = new Map<number, Map<string, number>>();
  for (const [level, topic, n] of rows) {
    stock.set(level, (stock.get(level) ?? new Map()).set(topic, n));
  }
  return stock;
};

const ok = (cost = 0.01): PipelineOutcome => ({
  ok: true,
  story: storyFixture(1, 'A story'),
  usage: { attempts: 1, costUsd: cost },
});
const rejected: PipelineOutcome = {
  ok: false,
  error: { kind: 'checks_failed', reason: 'too long' },
  usage: { attempts: 3, costUsd: 0.02 },
};

describe('allLevels', () => {
  it('runs from MIN_LEVEL to MAX_LEVEL', () => {
    const levels = allLevels();
    expect(levels[0]).toBe(MIN_LEVEL);
    expect(levels.at(-1)).toBe(MAX_LEVEL);
    expect(levels).toHaveLength(MAX_LEVEL - MIN_LEVEL + 1);
  });
});

describe('planRefill', () => {
  it('plans one job per missing story', () => {
    const jobs = planRefill(stockOf([[1, 'animals', 1]]), {
      levels: [1],
      topics: ['animals'],
      targetPerTopic: 3,
    });
    expect(jobs).toEqual([
      { level: 1, topic: 'animals', have: 1 },
      { level: 1, topic: 'animals', have: 1 },
    ]);
  });

  it('plans nothing for topics already at target', () => {
    const stock = stockOf(topics.map((t): [number, string, number] => [1, t, 3]));
    expect(planRefill(stock, { levels: [1], topics, targetPerTopic: 3 })).toEqual([]);
  });

  it('respects the cap', () => {
    const jobs = planRefill(new Map(), { levels: [1, 2], topics, targetPerTopic: 3, maxJobs: 4 });
    expect(jobs).toHaveLength(4);
  });

  it('orders lowest stock first, then level, then topic order', () => {
    const stock = stockOf([
      [1, 'animals', 2],
      [1, 'sea', 1],
      [2, 'animals', 0],
      [2, 'sea', 1],
    ]);
    const jobs = planRefill(stock, {
      levels: [1, 2],
      topics: ['animals', 'sea'],
      targetPerTopic: 3,
      maxJobs: 100,
    });
    const cells = [...new Set(jobs.map((j) => `${j.level}:${j.topic}:${j.have}`))];
    expect(cells).toEqual(['2:animals:0', '1:sea:1', '2:sea:1', '1:animals:2']);
  });

  it('gives no jobs for an empty topic list or an empty level list', () => {
    expect(planRefill(new Map(), { levels: [1], topics: [] })).toEqual([]);
    expect(planRefill(new Map(), { levels: [], topics })).toEqual([]);
  });
});

describe('runRefill', () => {
  const setup = (script: PipelineOutcome[] | (() => PipelineOutcome), seed: BankEntry[] = []) => {
    const store = memoryStore(seed);
    const pipeline = fakePipeline(script);
    const { log, events } = captureLog();
    const deps = { store, pipeline, clock: fixedClock([0, 10]), log };
    return { store, pipeline, events, deps };
  };

  it('saves only ok outcomes, logs one record per job and continues after a throw', async () => {
    let n = 0;
    const { store, events, deps } = setup(() => {
      n += 1;
      if (n === 1) throw new Error('boom');
      return n === 2 ? rejected : ok();
    });
    const summary = await runRefill(deps, {
      levels: [1],
      topics: ['animals'],
      targetPerTopic: 3,
    });
    expect(summary.planned).toBe(3);
    expect(store.entries).toHaveLength(1);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.data.trigger === 'refill')).toBe(true);
  });

  it('adds up the summary counts and cost', async () => {
    const { deps } = setup([ok(0.01), rejected, ok(0.03)]);
    deps.clock = fixedClock([0, 10, 10, 20, 20, 30]);
    const summary = await runRefill(deps, { levels: [1], topics: ['animals'], targetPerTopic: 3 });
    expect(summary).toMatchObject({ planned: 3, stored: 2, rejected: 1, failed: 0 });
    expect(summary.costUsd).toBeCloseTo(0.06);
    expect(summary.latencyMs).toBe(30);
  });

  it('counts a failed save as a failed job and keeps going', async () => {
    const { store, deps } = setup([ok(), ok()]);
    let saves = 0;
    const realSave = store.save.bind(store);
    store.save = async (input) => {
      saves += 1;
      if (saves === 1) throw new Error('db down');
      return realSave(input);
    };
    const summary = await runRefill(deps, { levels: [1], topics: ['animals'], targetPerTopic: 2 });
    expect(summary).toMatchObject({ stored: 1, failed: 1 });
  });

  it('plans 0 jobs on a second run after a full refill', async () => {
    const { pipeline, deps } = setup(() => ok());
    const opts = { levels: [1, 2], topics, targetPerTopic: 2, maxJobs: 100 };
    const first = await runRefill(deps, opts);
    expect(first.stored).toBe(12);
    const callsAfterFirst = pipeline.calls.length;
    const second = await runRefill(deps, opts);
    expect(second.planned).toBe(0);
    expect(pipeline.calls).toHaveLength(callsAfterFirst);
  });
});
