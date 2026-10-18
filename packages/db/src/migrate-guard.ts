/**
 * Where migrations may run (BB-81, ADR 0007).
 *
 * Vercel sets VERCEL_ENV to production, preview or development. A preview build must never
 * migrate: previews share a database with development, and a pull request's migration would
 * change it before review. Production migrates in its build. Locally VERCEL_ENV is unset, and
 * a developer runs `db:migrate` against their own DATABASE_URL.
 */
export type MigrationDecision = { run: true } | { run: false; reason: string };

export function migrationAllowed(env: Record<string, string | undefined>): MigrationDecision {
  if (env.VERCEL_ENV === 'preview') {
    return { run: false, reason: 'Preview deploys never run migrations (ADR 0007).' };
  }
  if (!env.DATABASE_URL) return { run: false, reason: 'DATABASE_URL is not set.' };
  return { run: true };
}
