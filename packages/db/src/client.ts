import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** Opens a Postgres connection. Pass a pooled URL on Vercel. Call `close` in scripts and tests. */
export function createDb(url: string) {
  const client = postgres(url, { max: 5, prepare: false });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

/** Reads DATABASE_URL and fails loudly when it is missing. */
export function createDbFromEnv() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return createDb(url);
}
