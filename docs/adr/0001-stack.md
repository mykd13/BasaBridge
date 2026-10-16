# 0001 Stack

Status: proposed. Date: 2026-10-17.

## Decision

- One Next.js (App Router, TypeScript) app on Vercel. Server Actions and route handlers are the API.
- pnpm workspaces and Turborepo. Packages export TypeScript source.
- Postgres with Drizzle. Hosted through the Vercel Marketplace.
- zod schemas in `packages/contracts` are the only shared types between speech, engine, AI and UI.
- AI calls go through the Vercel AI SDK and AI Gateway. Model names live in one file.
- Speech goes through a `SpeechProvider` interface so the provider can change.
- TypeScript is pinned to 6 for now because typescript-eslint does not support 7 yet. Revisit when it does.

## Why

A single deployable app is the fastest path for four people. Pure packages for levels and mastery keep the rules testable and tunable without touching the UI. The speech provider is the largest unknown, so it sits behind an interface and is chosen by a bake-off (BB-22).

## Open

- Auth library (BB-07): needs username-only student sign-up and email-based parent sign-up.
- Speech provider and transport (BB-22, BB-23).
- Styling approach for the web app (plain CSS with tokens today).
