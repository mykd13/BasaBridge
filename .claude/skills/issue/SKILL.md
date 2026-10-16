---
name: issue
description: Work one Linear issue (team BB) end to end. Fetches the issue and its comments, reads only the specs and design screens it names, writes a plan, works in its own git worktree, verifies every acceptance criterion with evidence, and opens a pull request for review. Never merges. Run as /issue BB-12, or /issue BB-12 auto to skip the pause after the plan.
argument-hint: '<BB-number> [auto]'
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Edit, Write, EnterWorktree, Bash(git:*), Bash(pnpm:*), Bash(npx playwright:*), Bash(cp:*), Bash(mkdir:*), Bash(gh auth status), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr list:*), mcp__linear__get_issue, mcp__linear__list_comments, mcp__linear__save_issue, mcp__linear__save_comment, mcp__claude_ai_Linear__get_issue, mcp__claude_ai_Linear__list_comments, mcp__claude_ai_Linear__save_issue, mcp__claude_ai_Linear__save_comment
---

# /issue

Take one Linear issue from Todo to an open pull request. A human reviews and merges it. You never merge, approve or push to main.

Arguments: `$ARGUMENTS`

- **The issue ID:** the first argument, such as `BB-12`. Accept `bb-12` or plain `12`, and normalize to `BB-12`. If there is no ID, ask for one and stop.
- **auto:** if the second argument is `auto`, skip the pause after the plan. Otherwise pause once, after the plan.

`AGENTS.md` and `CLAUDE.md` apply the whole time. This skill adds the order of work on top of them.

The Linear tools may be named `mcp__linear__*` or `mcp__claude_ai_Linear__*`, depending on how Linear was connected. Use whichever exists.

## 1. Fetch the issue

Use `get_issue` with the ID, then `list_comments` on it. Read:

- the title, description, labels, status, assignee, project and milestone;
- the "blocked by" relations.

The description holds the area, owner, reviewer, screens, specs, crossings and acceptance criteria. Comments can hold decisions that change it, so read them too.

**If the Linear tools are missing or ask for sign-in:** stop. Tell the user to connect Linear (in Claude Code, run `/mcp`; in the desktop app, use the connector settings) and make sure it points at the seanmyk workspace. Do not guess the issue from memory.

**Status:**

- Done or Canceled: stop.
- In Review: ask whether to continue on the existing pull request instead of starting a new one.

## 2. Check that it is ready

**Blockers.** For each blocking issue, check whether its work is on main: Done in Linear, or a commit mentioning it in `git log origin/main --oneline`.

- **Foundation blocker:** stop and name it. Foundation means repo tooling and CI, the schema and migrations (`packages/db`), the shared shapes in `packages/contracts`, auth, the authorization layer, `packages/ui`, or a package function this issue calls. Building without it means doing the work twice.
- **Other blocker:** if the missing blocker is another screen or feature, continue without it, and say so in the pull request.

**Non-code issues.** Some issues need no code: the Vercel project, repo protections, provider accounts, the speech bake-off recordings, the privacy review with a qualified person. They need no worktree or pull request.

1. Show the acceptance criteria as a checklist.
2. Help the user through it.
3. At the end, post a short Linear comment with the results and set the issue to Done once the user confirms.

## 3. Read before planning

Read only what the issue points to, in this order:

1. **Specs:** the `docs/PLAN.md` sections the issue lists, not the whole file. Grep for `^## ` and `^### ` with line numbers, then Read each listed section with offset and limit. Also read any ADR in `docs/adr/` it names.
2. **Screens:** each screen the issue names, found by ID in `docs/SCREENS.md` and read from `design/canvas/project/<file>`.
   - Use the markup for exact copy, structure, order and sizes.
   - Ignore mockup-only parts: sample names, numbers and stories, inline `<svg>` paths, and the `<x-dc>` / `data-props` wrapper.
   - Map repeated pieces (buttons, option cards, progress bars, chips, tabs, notices) to `packages/ui` components, and add them there if they are missing and the issue allows it.
3. **Contracts:** the ones the work uses: `packages/contracts/src/index.ts`, `packages/db/src/schema.ts`, `packages/levels`, `packages/speech` types.
4. **Existing code:** in the issue's area and in `packages/ui`, list files with Glob, then Read only the ones the plan will use or change. Reuse rather than rebuild. Do not read the area file by file.

## 4. Plan

Write a short numbered plan. Each step should be small enough to be one commit. Include:

- files to create or change, all inside the owner's area from the table in `.claude/skills/create-issue/SKILL.md`
- shared components and helpers you will reuse
- where the data comes from: real database tables, a package function, or the fake speech provider for local work. Never seeded demo users.
- how you will check each acceptance criterion
- a **needs from others** list for anything outside the area: a change in a locked area, a new dependency, a new shared component, a new contract field. Don't make those changes yourself unless the issue lists them under Crossings.

Put the steps in your todo list. Unless the second argument is `auto`, show the plan and wait for the user to say go. Reading a plan takes half a minute and catches a misread issue before an hour goes into it. If the user changes the plan, update it.

For changes to `packages/db` (schema or migrations), `packages/contracts`, the authorization layer, consent or retention rules, or anything that sends data to a model or speech provider, the plan pause is required even with `auto`.

## 5. Work in its own worktree

Each issue gets its own worktree, so parallel sessions never touch each other's files.

- **Already inside one:** if the session is already inside `.claude/worktrees/bb-<n>`, use it.
- **Create one:** otherwise run `git fetch origin`, then use the EnterWorktree tool with the name `bb-<n>`. The branch name contains the issue ID, which is what lets Linear link the pull request.
- **Bring it up to date:** if the worktree has no commits of its own yet, run `git merge --ff-only origin/main`.
- **No EnterWorktree tool:**
  1. Run `git worktree add .claude/worktrees/bb-<n> -b bb-<n> origin/main`.
  2. Tell the user to open a new terminal with `cd .claude/worktrees/bb-<n>` then `claude`, and run `/issue BB-<n>` there.
  3. Stop. Editing another directory from a session rooted somewhere else is error prone.

Set up the worktree:

- **Dependencies:** `pnpm install --frozen-lockfile`. Use plain `pnpm install` only if you are adding a dependency the issue allows, and commit the lockfile.
- **Env files:** env files arrive through `.worktreeinclude`. If one is missing, copy it from the main checkout three levels up (`../../../`). Values stay local and are never committed.
- **Ports:** the web dev server uses port `5000 + n` (BB-12 → `pnpm --filter @basabridge/web dev --port 5012`). That way several sessions can run at once.
- **Database:** use the development database from `.env.local`. Run migrations only in issues that own `packages/db`, and say so in the report, since a migration changes the shared development database for every session.

Then set the Linear issue to In Progress with `save_issue`, and assign it to `me` if it has no assignee.

## 6. Build

Follow the plan one step at a time. Commit after each step with a Conventional Commit that ends with the issue ID:

```
feat(web): sign-up form with age gate step (BB-12)
fix(db): link codes cannot be reused (BB-9)
test(mastery): level movement at the top and bottom (BB-19)
```

Scopes: `web`, `ui`, `db`, `contracts`, `levels`, `mastery`, `story-ai`, `teacher-ai`, `speech`, `docs`, `ci`, `design`.

The `AGENTS.md` rules that matter most here:

- **Mastery:** skill estimates, pass rule, level movement and focus skill are computed in `packages/mastery` and `packages/levels` only. The AI never decides them.
- **Privacy:** no names, usernames or audio in prompts or logs. A test inspects any new prompt for forbidden fields.
- **Audio:** discarded after analysis unless the learner turned retention on. Parents never get audio.
- **Authorization:** learner data is read only through the authorization layer.
- **Server rules:** the server scores answers, counts tries and enforces the under-13 microphone gate.
- **Levels:** level numbers and tries live only in `packages/levels`.
- **Stories and AI output:** stories pass the deterministic checks and the verifier before they are shown; AI output is validated with the zod schemas and falls back to standard wording.
- **UI:** `packages/ui` tokens and components only, with no new hex colors or one-off sizes. Copy taken from the design file.
- **No fake data:** screens start empty. No seeded demo users in app code.
- **Secrets:** no secrets. Use `.env.local` and `example.env`.

Stop and ask instead of pushing through when:

- the work needs a change in a locked area or in shared files (`package.json` at the root, `pnpm-workspace.yaml`, `packages/ui`, `packages/contracts`, `packages/db`) and the issue doesn't list it under Crossings or own that area
- the issue is turning out much bigger than expected. Propose a split.
- the plan doc, the design and the issue disagree. Describe them and ask which wins.
- the change would send new kinds of data to a model or speech provider.

## 7. Verify

Evidence before claims. Never say something works without having run it.

1. **Checks.** Run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Fix failures. Never skip or delete a test to get green.
2. **Screenshots** (UI issues).
   - Start the dev server on the issue port, then screenshot every route and state in the issue, for example `npx playwright screenshot --viewport-size=1280,800 http://localhost:<port><route> tmp/bb-<n>/<screen>.png`.
     - Sizes: 1280×800 for desktop. Also 390×844 for pages that must work on a phone.
     - If Playwright has no browser yet, run `npx playwright install chromium` once.
   - Read each screenshot and compare it with the design file: layout order, copy, sizes, states. Fix visible differences, and screenshot again. Do at least one pass.
3. **Acceptance criteria.** Walk through every criterion. Mark each one as passed with how you checked it, or as needing a manual check when it requires something you can't do here (a real microphone, a real child's voice, a real speech provider, a real guardian email). Never mark a criterion passed that you did not check.
4. **Rebase.** Run `git fetch origin && git rebase origin/main`. If anything changed, run the checks again.

## 8. Open the pull request

1. `git push -u origin HEAD`.
2. Write the body from `pr-body.md` in this folder to `tmp/bb-<n>/pr.md`, filling every section. Then run `gh pr create --base main --title "BB-<n> <issue title>" --body-file tmp/bb-<n>/pr.md`. Open it ready for review, not as a draft.
3. If `gh` is not installed or not signed in (`gh auth status`):
   - Print the compare link `https://github.com/mykd13/BasaBridge/compare/main...<branch>?expand=1` and the path to `tmp/bb-<n>/pr.md`, so the user can paste the body.
   - Suggest `brew install gh`, then `gh auth login`.
4. Set the Linear issue to In Review. Add a Linear comment with the pull request link if the GitHub integration has not linked it already.

Never merge, approve or force push, and never push to main. The reviewer named in the issue merges it.

## 9. Report back

End with a short message:

- the pull request link (or the compare link)
- acceptance criteria: how many passed, and which need a manual check
- anything needed from others
- how to try it: `cd .claude/worktrees/bb-<n>`, the dev command with its port, and the URL

Remind the user that after the pull request is merged they can remove the worktree with `git worktree remove .claude/worktrees/bb-<n>`.
