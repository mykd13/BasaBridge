import { createDbFromEnv, type Db } from '@basabridge/db';

let shared: Db | undefined;

/** One pooled connection per server instance, opened on first use. */
export function getDb(): Db {
  shared ??= createDbFromEnv().db as unknown as Db;
  return shared;
}
