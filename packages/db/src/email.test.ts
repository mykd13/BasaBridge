import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { getSuppression, hashAddress, suppressAddress } from './email';
import type { Db } from './queries';
import * as schema from './schema';

const secret = 'test-email-hash-secret';
let client: PGlite;
let db: Db;

beforeAll(async () => {
  client = new PGlite();
  const pg = drizzle(client, { schema });
  await migrate(pg, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  db = pg as unknown as Db;
});

describe('email suppressions', () => {
  it('finds nothing for a clean address', async () => {
    expect(await getSuppression(db, secret, 'guardian@example.test')).toBeUndefined();
  });

  it('suppresses an address whatever its case or spacing', async () => {
    await suppressAddress(db, secret, 'Bounce@Example.test', 'bounce', 'em_1');
    expect(await getSuppression(db, secret, ' bounce@example.test ')).toEqual({
      reason: 'bounce',
    });
  });

  it('keeps the first reason when the same address is reported again', async () => {
    await suppressAddress(db, secret, 'bounce@example.test', 'complaint', 'em_2');
    expect(await getSuppression(db, secret, 'bounce@example.test')).toEqual({ reason: 'bounce' });
  });

  it('stores only a keyed hash, never the address', async () => {
    const res = await db.execute(sql`select address_hash from email_suppressions`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as {
      address_hash: string;
    }[];
    expect(rows.map((r) => r.address_hash)).toContain(hashAddress('bounce@example.test', secret));
    expect(JSON.stringify(rows)).not.toContain('@');
  });

  it('cannot be matched by a plain SHA-256 or with another secret', async () => {
    const plain = createHash('sha256').update('bounce@example.test').digest('hex');
    expect(hashAddress('bounce@example.test', secret)).not.toBe(plain);
    expect(await getSuppression(db, 'another-secret', 'bounce@example.test')).toBeUndefined();
  });

  it('refuses an empty secret', () => {
    expect(() => hashAddress('a@example.test', '')).toThrow('secret');
  });

  it('refuses a reason other than bounce or complaint', async () => {
    await expect(
      client.query(`insert into email_suppressions (address_hash, reason) values ('x', 'spam')`),
    ).rejects.toThrow('email_suppressions_reason_check');
  });
});
