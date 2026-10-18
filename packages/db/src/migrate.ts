/**
 * Applies the SQL files in packages/db/migrations to DATABASE_URL.
 * Run with `pnpm --filter @basabridge/db db:migrate`. Safe to run twice.
 * Production runs it in its Vercel build; previews refuse (ADR 0007).
 */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDbFromEnv } from './client';
import { migrationAllowed } from './migrate-guard';

const decision = migrationAllowed(process.env);
if (!decision.run) {
  console.error(`Not migrating: ${decision.reason}`);
  process.exit(1);
}

const { db, close } = createDbFromEnv();
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  console.log('Migrations applied');
} finally {
  await close();
}
