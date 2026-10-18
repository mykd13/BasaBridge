# 0007 Migrations per environment

Status: accepted. Date: 2026-10-18.

## Problem

Migrations run in CI against a throwaway database, but nothing ran them on Vercel. Every table added after the first migration (auth, audit log, feature flags, email suppressions) would be missing in production. Production must be migrated before its code goes live, and a failed migration must stop the deploy. Previews must not change a shared database before a pull request is reviewed.

## Options

- **Migrate in the Vercel production build.** The build runs `db:migrate`, then `next build`. A failed migration fails the build, and Vercel keeps the previous deploy live.
- **A GitHub Actions job on push to `main`.** Credentials stay in GitHub, but Vercel deploys in parallel, so new code can go live before the migration finishes or after it fails. Ordering them needs deploys from Actions with a Vercel token.
- **A Neon branch per preview.** Each preview gets its own database copy and can migrate it safely. It needs the Neon integration's preview branching set up, and adds cost and setup. A later option.

## Decision

- **Production** migrates in its Vercel build. `apps/web/vercel.json` runs `pnpm --filter @basabridge/db db:migrate` when `VERCEL_ENV` is `production`, then `next build`. A failed migration fails the build.
- **Preview** never migrates. `db:migrate` refuses when `VERCEL_ENV` is `preview`, so even a changed build command cannot do it.
- **Development** (local) runs `pnpm --filter @basabridge/db db:migrate` against the developer's `DATABASE_URL`.
- **Production has its own database.** Production's `DATABASE_URL` points at a production Neon branch. Preview and development share a separate branch.

## Consequences

- A preview of a pull request that adds a migration runs against a database without it, so the new tables are missing there. Run `db:migrate` against the development branch by hand to try it, or wait for Neon preview branches.
- Migrations must be backwards compatible with the code currently live, because the old deploy stays up while the new build runs. Add columns and tables first; drop or rename only in a later pull request once nothing reads the old shape.
- A pull request that drops or renames a column must say in its description that the data was checked first. The pull request template asks.
- Production's database URL is available to the production build, which is Vercel's default for environment variables.

## Manual setup

1. In Neon, create a `production` branch.
2. In Vercel, set Production's `DATABASE_URL` to that branch. Keep Preview and Development on the current branch.
3. The first production deploy after this change applies every migration to the new branch.
