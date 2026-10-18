# Database migrations

How schema changes reach each database. The reasons are in [ADR 0007](adr/0007-migrations-per-environment.md).

## Make a migration

1. Change `packages/db/src/schema.ts`.
2. Run `pnpm --filter @basabridge/db db:generate --name <short_name>`.
3. Commit the new SQL file and the files under `packages/db/migrations/meta`.

For SQL that Drizzle cannot generate, such as a trigger, run `pnpm --filter @basabridge/db exec drizzle-kit generate --custom --name <short_name>` and write the SQL into the empty file.

## Where migrations run

| Environment | When                    | How                                                                 |
| ----------- | ----------------------- | ------------------------------------------------------------------- |
| CI          | Every pull request      | A throwaway Postgres in the `check` job.                            |
| Development | When you choose         | `pnpm --filter @basabridge/db db:migrate` with your `DATABASE_URL`. |
| Preview     | Never                   | `db:migrate` refuses when `VERCEL_ENV` is `preview`.                |
| Production  | Every production deploy | The Vercel build runs `db:migrate` before `next build`.             |

If the production migration fails, the build fails and the previous deploy stays live. Read the build log, fix the migration in a new pull request, and merge again.

## Rules

- **Backwards compatible.** The old code stays live while the new build runs, so a migration must work with it. Add first; drop or rename later, once nothing reads the old shape.
- **Dropping or renaming a column** needs a line in the pull request saying the data was checked first. The pull request template asks.
- **Never edit a migration that has merged.** Add a new one.
- **Two pull requests with the same migration number.** The second to merge takes `main`'s `meta` files, deletes its own SQL and snapshot, and runs `db:generate` again. A custom migration copies its SQL back into the new file.

## Before the first production deploy

Do this before this change merges. A production build now fails without it.

1. In Neon, create a `production` branch.
2. In Vercel, set Production's `DATABASE_URL` to that branch. Keep Preview and Development on the current branch.
3. Confirm the first production deploy applies every migration to the new branch.

`db:migrate` stops with an error when `DATABASE_URL` is missing, so a production build without it fails on purpose. The same steps are in [ADR 0007](adr/0007-migrations-per-environment.md).
