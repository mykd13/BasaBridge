import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { readFlagChanges, readFlagRows, writeFlag } from './flags';
import type { Db } from './queries';
import * as schema from './schema';

let db: Db;

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema });
  await migrate(pg, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  db = pg as unknown as Db;
});

describe('feature flag storage', () => {
  it('starts empty, so every flag is on its default', async () => {
    expect(await readFlagRows(db)).toEqual([]);
  });

  it('stores a value and logs the change with no old value', async () => {
    await writeFlag(db, 'listen_then_read', true, null);
    const rows = await readFlagRows(db);
    expect(rows.map((r) => [r.key, r.value])).toEqual([['listen_then_read', true]]);
    const log = await readFlagChanges(db, 'listen_then_read');
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ oldValue: null, newValue: true, actorUserId: null });
  });

  it('overwrites the value and logs the old one', async () => {
    const actor = '8f14e45f-ceea-467f-a0e6-1e2a3b4c5d6e';
    await writeFlag(db, 'listen_then_read', false, actor);
    const [row] = (await readFlagRows(db)).filter((r) => r.key === 'listen_then_read');
    expect(row?.value).toBe(false);
    const log = await readFlagChanges(db, 'listen_then_read');
    expect(log).toHaveLength(2);
    expect(log[1]).toMatchObject({ oldValue: true, newValue: false, actorUserId: actor });
  });

  it('stores object values such as model choices', async () => {
    const models = { story: 'google/a', verifier: 'google/b', notes: 'google/a' };
    await writeFlag(db, 'model_choices', models, null);
    const [row] = (await readFlagRows(db)).filter((r) => r.key === 'model_choices');
    expect(row?.value).toEqual(models);
  });
});
