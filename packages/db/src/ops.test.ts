import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from './schema';
import {
  attachCallsToStory,
  callOutcomesSince,
  costOfStory,
  costReport,
  incrementCounter,
  insertAiCall,
  pickBankStory,
  pruneOps,
  readCounter,
  maxCounterSince,
  sumCostSince,
} from './ops';
import { createUser, deleteUser, insertStory, type Db } from './queries';

let db: Db;
let learnerId: string;

const T0 = new Date('2026-10-18T00:00:00Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema });
  await migrate(pg, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  db = pg as unknown as Db;
  learnerId = (await createUser(db, { role: 'student', username: 'ops-l', passwordHash: 'x' })).id;
});

const story = (level: number, source: 'bank' | 'generated') =>
  insertStory(db, { level, title: 't', text: 'x', words: 1, readingGrade: 1, source });

describe('ai_calls', () => {
  it('sums cost for everyone and for one learner', async () => {
    await insertAiCall(db, {
      kind: 'story',
      model: 'm',
      outcome: 'ok',
      latencyMs: 100,
      costUsd: 0.5,
      learnerUserId: learnerId,
      at: at(1),
    });
    await insertAiCall(db, {
      kind: 'notes',
      model: 'm',
      outcome: 'ok',
      latencyMs: 300,
      costUsd: 0.25,
      at: at(2),
    });
    await insertAiCall(db, {
      kind: 'notes',
      model: 'm',
      outcome: 'error',
      latencyMs: 9,
      at: at(3),
    });
    expect(await sumCostSince(db, T0)).toBeCloseTo(0.75);
    expect(await sumCostSince(db, T0, learnerId)).toBeCloseTo(0.5);
    expect(await sumCostSince(db, at(10))).toBe(0);
  });

  it('counts calls with no recorded cost at the unknown call price', async () => {
    // Three calls above in this window: two priced, one error with no cost.
    expect(await sumCostSince(db, T0, undefined, 0.1)).toBeCloseTo(0.85);
    expect(await sumCostSince(db, T0, learnerId, 0.1)).toBeCloseTo(0.5);
  });

  it('records cost per story through the run id', async () => {
    const runId = '00000000-0000-4000-8000-000000000001';
    for (const kind of ['story', 'verifier'] as const)
      await insertAiCall(db, {
        kind,
        model: 'm',
        outcome: 'ok',
        latencyMs: 1,
        costUsd: 0.1,
        runId,
        at: at(4),
      });
    const s = await story(3, 'generated');
    await attachCallsToStory(db, runId, s.id);
    expect(await costOfStory(db, s.id)).toBeCloseTo(0.2);
  });

  it('counts failures by kind', async () => {
    expect(await callOutcomesSince(db, 'notes', T0)).toEqual({ calls: 2, failures: 1 });
    expect(await callOutcomesSince(db, 'speech', T0)).toEqual({ calls: 0, failures: 0 });
  });

  it('reports cost per learner per local day and kind', async () => {
    // 20:00 UTC on the 18th is 04:00 on the 19th in the Philippines.
    await insertAiCall(db, {
      kind: 'story',
      model: 'm',
      outcome: 'ok',
      latencyMs: 50,
      costUsd: 1,
      learnerUserId: learnerId,
      at: at(20 * 60),
    });
    const rows = await costReport(db, T0, at(24 * 60), 8);
    const mine = rows.filter((r) => r.learnerUserId === learnerId);
    expect(mine).toEqual([
      {
        day: '2026-10-18',
        learnerUserId: learnerId,
        kind: 'story',
        calls: 1,
        failures: 0,
        costUsd: 0.5,
        avgLatencyMs: 100,
      },
      {
        day: '2026-10-19',
        learnerUserId: learnerId,
        kind: 'story',
        calls: 1,
        failures: 0,
        costUsd: 1,
        avgLatencyMs: 50,
      },
    ]);
    const notes = rows.find((r) => r.kind === 'notes')!;
    expect(notes).toMatchObject({ learnerUserId: null, calls: 2, failures: 1, avgLatencyMs: 155 });
  });

  it('keeps the cost but drops the learner link when the learner is deleted', async () => {
    const u = await createUser(db, { role: 'student', username: 'ops-gone', passwordHash: 'x' });
    await insertAiCall(db, {
      kind: 'tts',
      model: 'm',
      outcome: 'ok',
      latencyMs: 1,
      costUsd: 2,
      learnerUserId: u.id,
      at: at(5),
    });
    await deleteUser(db, u.id);
    expect(await sumCostSince(db, at(5))).toBeGreaterThanOrEqual(2);
    expect(await sumCostSince(db, at(5), u.id)).toBe(0);
  });
});

describe('rate_counters', () => {
  it('increments atomically per key and window', async () => {
    const w = at(0);
    const exp = at(60);
    const counts = await Promise.all(
      Array.from({ length: 5 }, () => incrementCounter(db, 'k1', w, exp)),
    );
    expect(counts.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(await incrementCounter(db, 'k1', at(1), exp)).toBe(1);
    expect(await readCounter(db, 'k1', w)).toBe(5);
    expect(await readCounter(db, 'missing', w)).toBe(0);
  });

  it('finds the peak window since a time', async () => {
    const exp = at(600);
    await incrementCounter(db, 'peak', at(0), exp);
    for (let i = 0; i < 3; i++) await incrementCounter(db, 'peak', at(5), exp);
    await incrementCounter(db, 'peak', at(10), exp);
    expect(await maxCounterSince(db, 'peak', at(0))).toBe(3);
    expect(await maxCounterSince(db, 'peak', at(10))).toBe(1);
    expect(await maxCounterSince(db, 'none', at(0))).toBe(0);
  });

  it('prunes expired counters and old calls', async () => {
    await incrementCounter(db, 'old', at(0), at(1));
    await pruneOps(db, at(2), at(0));
    expect(await readCounter(db, 'old', at(0))).toBe(0);
    expect(await readCounter(db, 'k1', at(0))).toBe(5);
    await pruneOps(db, at(2), at(24 * 60 * 2));
    expect(await sumCostSince(db, T0)).toBe(0);
  });
});

describe('pickBankStory', () => {
  it('returns a bank story at the level and skips excluded ones', async () => {
    const a = await story(7, 'bank');
    const b = await story(7, 'bank');
    await story(7, 'generated');
    await story(8, 'bank');
    const picked = await pickBankStory(db, 7, [a.id]);
    expect(picked?.id).toBe(b.id);
    expect(await pickBankStory(db, 7, [a.id, b.id])).toBeUndefined();
    expect(await pickBankStory(db, 9)).toBeUndefined();
  });
});
