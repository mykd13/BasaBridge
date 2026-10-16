# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot and others) working in this repository. Humans should read it too: it is the shortest summary of how this project works.

## What this project is

BasaBridge is a web app that helps students read for meaning.

- **Read aloud:** a learner reads a short English story out loud. The microphone listens.
- **Analyse:** code compares what was said with the text. The AI Teacher explains what it found.
- **Answer:** the learner answers questions with the story hidden. The server scores them.
- **Adjust:** levels, tries and the next story follow rules in code. Parents are optional and see only what a student shares.

Read [docs/PLAN.md](docs/PLAN.md) before making changes that cross folders.

## Golden rules

These are not style preferences. Breaking one is a bug, even if tests pass.

1. **Mastery is computed in code.** Skill estimates, pass rule, level movement and the focus skill come from `packages/mastery` and `packages/levels`. The AI explains results and never decides them.
2. **No names, usernames or audio go to a model, a speech log or any other log.** Prompts carry levels, story text, counts and word-level differences only.
3. **Audio is discarded after analysis** unless the learner turned retention on. Parents never get audio.
4. **Every read of learner data goes through the authorization layer** (BB-10). No page or route queries learner tables directly.
5. **The server scores answers, counts tries and enforces the under-13 microphone gate.** The browser never decides any of them.
6. **Level numbers, tries and the pass rule live only in `packages/levels`.** Do not copy them into the UI or the prompts.
7. **Generated stories pass the checks before a learner sees them.** AI output is validated against the zod schemas in `packages/contracts`, and anything invalid falls back to standard wording or fails visibly.
8. **No fake data.** Screens start empty and fill from real activity. No seeded demo users in app code.
9. **Never commit secrets.** Use `.env.local` (gitignored) and `example.env`.
10. **Practice in Learn never changes a level.** Level moves only on story evidence, and a lesson counts as learned only after fresh questions in a real story.
11. **Learners never chat freely with a model.** Text shown to a learner comes from fixed, validated formats.
12. **Every accommodation is recorded.** Question read-aloud, listen-then-read and word tap are logged on the answers they affect, never hidden.
13. **All interface text goes through the i18n catalog** in English and Filipino, with a simple and a standard wording. No hard-coded strings.

## Locked areas

Changing these needs agreement from the owners on both sides. Say so in the PR description and tag them.

| Area                                                   | Where                                                         | Owner                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------- |
| Shared shapes                                          | `packages/contracts`                                          | Rhett, plus the owner on the other side of the change |
| Database schema and migrations                         | `packages/db`                                                 | Rhett                                                 |
| Authorization layer and sharing rules                  | BB-10                                                         | Rhett                                                 |
| Consent text, age gate, audio retention                | BB-8, BB-30, BB-41                                            | Rhett and James                                       |
| Anything that sends data to a model or speech provider | `packages/story-ai`, `packages/teacher-ai`, `packages/speech` | Jhade and James                                       |

UI screens, copy and app structure change freely within the design canvas.

## Owners and areas

| Area                           | Folders                                                                                                            | Owner |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----- |
| Platform and accounts          | `packages/db/**`, `packages/contracts/**`, `.github/**`, root config, `docs/adr/**`                                | Rhett |
| Speech and reading analysis    | `packages/speech/**`                                                                                               | James |
| AI teacher and learning engine | `packages/levels/**`, `packages/mastery/**`, `packages/learn/**`, `packages/story-ai/**`, `packages/teacher-ai/**` | Jhade |
| Product experience             | `apps/web/**`, `packages/ui/**`, `design/**`, `docs/**` (except `docs/adr`)                                        | Sean  |

## Repository map

| Path                  | What lives there                                                 |
| --------------------- | ---------------------------------------------------------------- |
| `apps/web`            | Next.js app: student and parent screens, route handlers          |
| `packages/contracts`  | zod schemas shared by everything                                 |
| `packages/db`         | Drizzle schema and migrations                                    |
| `packages/levels`     | Level table, tries tiers, pass and evidence rules                |
| `packages/mastery`    | Ability model, placement logic, focus skill, level movement      |
| `packages/learn`      | Gap mapping, lesson recommendation, Learn rules                  |
| `packages/story-ai`   | Story generation, deterministic checks, verifier                 |
| `packages/teacher-ai` | Teacher notes and standard fallbacks                             |
| `packages/speech`     | Speech provider interface, alignment, pace                       |
| `packages/ui`         | Design tokens and components                                     |
| `design`              | Canvas screens (`design/canvas/project`) and the early prototype |
| `docs`                | Plan, screens, decisions                                         |

## Commands

```bash
pnpm install          # install all workspaces
pnpm dev              # run the web app on http://localhost:3000
pnpm typecheck        # tsc everywhere
pnpm lint             # eslint
pnpm test             # vitest in every package
pnpm build            # build everything
pnpm format           # prettier --write (format:check to verify)
```

CI runs format check, lint, typecheck, tests and build on every pull request.

## Working on an issue

Work is tracked in Linear (team BB, project BasaBridge v1). Branches and commits carry the issue ID.

- `/create-issue <problem>` writes one issue. It shows a preview and creates nothing until you say go.
- `/issue BB-12` works one issue from Todo to an open pull request. A human reviews and merges.

Commit messages are Conventional Commits that end with the issue ID, for example `feat(web): sign-in form (BB-12)`. Scopes: `web`, `ui`, `db`, `contracts`, `levels`, `mastery`, `story-ai`, `teacher-ai`, `speech`, `docs`, `ci`, `design`.

Never merge your own pull request, push to `main`, or force push.

## Writing rules for issues, PRs and docs

- Plain English, short sentences, active voice.
- Sentence case for titles and headings.
- No em dashes or en dashes, no emoji.
- Say how you checked something, not just that it works.

Student-facing copy is written for children and follows the design canvas.
