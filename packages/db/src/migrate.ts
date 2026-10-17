/**
 * Applies the SQL files in packages/db/migrations to DATABASE_URL.
 * Run with `pnpm --filter @basabridge/db db:migrate`. Safe to run twice.
 */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDbFromEnv } from './client';

const { db, close } = createDbFromEnv();
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.log('Migrations applied');
} finally {
  await close();
}
