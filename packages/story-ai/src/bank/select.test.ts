import { describe, expect, it } from 'vitest';
import { nextStoryAfterTriesOut, selectStory, type SelectDeps, type SelectInput } from './select';
import { captureLog, fakePipeline, fixedClock, memoryStore, storyFixture } from './testing';
import type { BankEntry, PipelineOutcome } from './types';

const entry = (id: string, level: number, topic: string, age: number): BankEntry => ({
  id,
  level,
  topic,
  story: storyFixture(level, `Title ${id}`),
  createdAt: new Date(age),
});

const okOutcome = (level: number): PipelineOutcome => ({
  ok: true,
  story: storyFixture(level, 'Fresh story'),
  usage: { attempts: 1, costUsd: 0.001 },
});

const input = (over: Partial<SelectInput> = {}): SelectInput => ({
  level: 10,
  readStoryIds: [],
  recentTopics: [],
  recentTitles: [],
  focus: null,
  ...over,
});
const nextInput = (over: Partial<SelectInput> & { currentStoryId: string }) => ({
  ...input(),
  ...over,
});

function setup(seed: BankEntry[], script: PipelineOutcome[] = [okOutcome(10)]) {
  const store = memoryStore(seed);
  const pipeline = fakePipeline(script);
  const { log, events } = captureLog();
  const deps: SelectDeps = {
    store,
    pipeline,
    clock: fixedClock([0, 25]),
    log,
    pickTopic: () => 'space',
  };
  return { store, pipeline, events, deps };
}

describe('selectStory', () => {
  it('gives two learners the same stored story without calling the pipeline', async () => {
    const { deps, pipeline } = setup([entry('a', 10, 'animals', 1)]);
    const first = await selectStory(deps, input());
    const second = await selectStory(deps, input());
    expect(first).toMatchObject({ ok: true, source: 'bank' });
    expect(second).toMatchObject({ ok: true, source: 'bank' });
    if (first.ok && second.ok) expect(second.entry.id).toBe(first.entry.id);
    expect(pipeline.calls).toHaveLength(0);
  });

  it('never returns a story in readStoryIds', async () => {
    const { deps } = setup([entry('a', 10, 'animals', 1), entry('b', 10, 'sea', 2)]);
    const r = await selectStory(deps, input({ readStoryIds: ['a'] }));
    expect(r.ok && r.entry.id).toBe('b');
  });

  it('skips a recent topic when another is in stock, and returns it when it is the only one', async () => {
    const both = setup([entry('a', 10, 'animals', 1), entry('b', 10, 'sea', 2)]);
    const skipped = await selectStory(both.deps, input({ recentTopics: ['animals'] }));
    expect(skipped.ok && skipped.entry.id).toBe('b');

    const only = setup([entry('a', 10, 'animals', 1)]);
    const fallback = await selectStory(only.deps, input({ recentTopics: ['animals'] }));
    expect(fallback.ok && fallback.entry.id).toBe('a');
    expect(only.pipeline.calls).toHaveLength(0);
  });

  it('generates live, saves and logs one live record when stock is empty', async () => {
    const { deps, store, pipeline, events } = setup([]);
    const r = await selectStory(deps, input({ recentTitles: ['Old one'] }));
    expect(r).toMatchObject({ ok: true, source: 'generated' });
    expect(pipeline.calls).toHaveLength(1);
    expect(pipeline.calls[0]).toMatchObject({
      level: 10,
      topic: 'space',
      recentTitles: ['Old one'],
    });
    expect(store.entries).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toMatchObject({ trigger: 'live', outcome: 'stored', latencyMs: 25 });
  });

  it('does not save a rejected live story, and still logs a record', async () => {
    const rejected: PipelineOutcome = {
      ok: false,
      error: { kind: 'verifier_rejected', reason: 'unsafe' },
      usage: { attempts: 3 },
    };
    const { deps, store, events } = setup([], [rejected]);
    const r = await selectStory(deps, input());
    expect(r).toEqual({ ok: false, error: { kind: 'verifier_rejected', reason: 'unsafe' } });
    expect(store.entries).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0]!.data).toMatchObject({ outcome: 'rejected', trigger: 'live' });
  });

  it('returns a visible model_call failure when the pipeline throws', async () => {
    const { deps, store } = setup([]);
    deps.pipeline = fakePipeline(() => {
      throw new Error('boom');
    });
    const r = await selectStory(deps, input());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('model_call');
    expect(store.entries).toHaveLength(0);
  });

  it('never returns a story at another level', async () => {
    const { deps, pipeline } = setup([entry('a', 11, 'animals', 1), entry('b', 9, 'sea', 2)]);
    const r = await selectStory(deps, input());
    expect(r).toMatchObject({ ok: true, source: 'generated' });
    if (r.ok) expect(r.entry.level).toBe(10);
    expect(pipeline.calls).toHaveLength(1);
  });
});

describe('nextStoryAfterTriesOut', () => {
  it('never returns the current story or a read one, and keeps the level', async () => {
    const { deps } = setup([
      entry('cur', 10, 'animals', 1),
      entry('read', 10, 'sea', 2),
      entry('new', 10, 'space', 3),
    ]);
    const r = await nextStoryAfterTriesOut(
      deps,
      nextInput({ readStoryIds: ['read'], currentStoryId: 'cur' }),
    );
    expect(r.ok && r.entry.id).toBe('new');
    if (r.ok) expect(r.entry.level).toBe(10);
  });

  it('generates a new story at the same level when only the current one is stocked', async () => {
    const { deps, pipeline } = setup([entry('cur', 10, 'animals', 1)]);
    const r = await nextStoryAfterTriesOut(deps, nextInput({ currentStoryId: 'cur' }));
    expect(r).toMatchObject({ ok: true, source: 'generated' });
    if (r.ok) {
      expect(r.entry.id).not.toBe('cur');
      expect(r.entry.level).toBe(10);
    }
    expect(pipeline.calls).toHaveLength(1);
  });
});
