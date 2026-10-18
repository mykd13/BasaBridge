# BasaBridge

An AI reading teacher for students. A learner reads a short English story out loud, the AI listens and analyses the reading, then the learner answers questions about what they read. The next story adjusts to the result. Parents are optional and only see what a student chooses to share.

- Plan and backlog: [docs/PLAN.md](docs/PLAN.md)
- Screens: [design/](design/README.md) (exported from the design canvas)
- Decisions: [docs/adr/](docs/adr)

## Requirements

- Node 24 or newer (`.nvmrc`)
- pnpm 12 (`corepack enable` picks the version from `package.json`)

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

`pnpm install` also turns on the pre-commit hook in `.githooks`. It runs Prettier and ESLint on staged files.

Copy `example.env` to `.env.local` and fill in values when a task needs them. Never commit real values.

## Commands

| Command          | What it does                |
| ---------------- | --------------------------- |
| `pnpm dev`       | Run the web app             |
| `pnpm build`     | Build everything            |
| `pnpm typecheck` | Type-check every package    |
| `pnpm lint`      | ESLint                      |
| `pnpm test`      | Unit tests in every package |
| `pnpm format`    | Prettier                    |

CI runs format check, lint, typecheck, tests and build on every pull request.

## Layout

```
apps/web                Next.js app (student and parent screens)
packages/contracts      zod schemas shared by everything
packages/db             Drizzle schema and migrations
packages/levels         level table, tries tiers, pass and evidence rules
packages/mastery        ability model, placement logic, focus skill, level movement
packages/learn          gap mapping, lesson recommendation, Learn rules
packages/story-ai       story generation and deterministic checks
packages/teacher-ai     teacher notes and standard fallbacks
packages/speech         provider interface, alignment, pace
packages/ui             design tokens and components
design/                 canvas screens and the early prototype
docs/                   plan, decisions
```

Workspace packages export TypeScript source. The web app compiles them through `transpilePackages`.

## Who owns what

| Owner | Area                                                                                        |
| ----- | ------------------------------------------------------------------------------------------- |
| Rhett | Platform and accounts: CI, deploy, database, auth, age gate, parent link, consent, security |
| James | Speech and reading analysis                                                                 |
| Jhade | AI teacher and learning engine                                                              |
| Sean  | Product experience: design system, screens, integration, accessibility                      |

See `.github/CODEOWNERS` and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

This is the scaffold. Working seeds with tests: level table and evidence rules, ability model and placement logic, Learn gap mapping, story checks, speech pace maths, database schema, design tokens. Stubs that throw `not implemented`: story generation, teacher notes, word alignment. Each stub names the backlog item that replaces it.
