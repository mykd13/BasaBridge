import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { getSuppression, hashAddress, suppressAddress } from './email';
import type { Db } from './queries';
import * as schema from './schema';

let db: Db;

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema });
  await migrate(pg, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  db = pg as unknown as Db;
});

describe('email suppressions', () => {
  it('finds nothing for a clean address', async () => {
    expect(await getSuppression(db, 'guardian@example.test')).toBeUndefined();
  });

  it('suppresses an address whatever its case or spacing', async () => {
    await suppressAddress(db, 'Bounce@Example.test', 'bounce', 'em_1');
    expect(await getSuppression(db, ' bounce@example.test ')).toEqual({ reason: 'bounce' });
  });

  it('keeps the first reason when the same address is reported again', async () => {
    await suppressAddress(db, 'bounce@example.test', 'complaint', 'em_2');
    expect(await getSuppression(db, 'bounce@example.test')).toEqual({ reason: 'bounce' });
  });

  it('stores only a hash, never the address', async () => {
    const res = await db.execute(sql`select address_hash from email_suppressions`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as {
      address_hash: string;
    }[];
    expect(rows.map((r) => r.address_hash)).toContain(hashAddress('bounce@example.test'));
    expect(JSON.stringify(rows)).not.toContain('@');
  });
});
