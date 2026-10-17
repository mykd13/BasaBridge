/**
 * A throwaway Postgres for tests: PGlite in memory with every migration applied.
 * Import from `@basabridge/db/testing` in test files only.
 */
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Db } from './queries';
import * as schema from './schema';

export interface TestDb {
  db: Db;
  /** Runs raw SQL, for test setup the helpers do not cover. */
  exec(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const pg = drizzle(client, { schema });
  await migrate(pg, {
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  });
  return {
    db: pg as unknown as Db,
    async exec(sql, params) {
      await client.query(sql, params);
    },
    close: () => client.close(),
  };
}
