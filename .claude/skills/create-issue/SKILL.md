---
name: create-issue
description: Turn a problem into one Linear issue for one owner area. Reads only the code, screens and specs the problem points to, shows the full issue with questions and a recommendation for each, and creates nothing until the user says go. On go it creates the issue in Linear (team BB) and attaches pasted screenshots. Run as /create-issue followed by the problem, with screenshots pasted in.
argument-hint: '<the problem, in your own words>'
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git branch:*), Bash(git log:*), Bash(git fetch:*), Bash(gh pr list:*), Bash(wc:*), Bash(curl:*), mcp__linear__list_teams, mcp__linear__list_projects, mcp__linear__list_issue_labels, mcp__linear__list_users, mcp__linear__list_issues, mcp__linear__get_issue, mcp__linear__save_issue, mcp__linear__prepare_attachment_upload, mcp__linear__create_attachment_from_upload, mcp__claude_ai_Linear__list_teams, mcp__claude_ai_Linear__list_projects, mcp__claude_ai_Linear__list_issue_labels, mcp__claude_ai_Linear__list_users, mcp__claude_ai_Linear__list_issues, mcp__claude_ai_Linear__get_issue, mcp__claude_ai_Linear__save_issue, mcp__claude_ai_Linear__prepare_attachment_upload, mcp__claude_ai_Linear__create_attachment_from_upload
---

# /create-issue

Write one Linear issue from a problem the user describes. There are two phases with a hard gate between them:

1. Read the code and specs, then show a preview.
2. Only after the user says go, create it.

Nothing reaches Linear before go.

Problem: `$ARGUMENTS`

If there is no problem, ask for one and stop. Screenshots pasted with the message count as part of the problem.

You write the issue. You never fix the problem, edit app code or start a branch here. `/issue BB-<n>` does the work later, and it reads what you write. So write for it: owner area, route or files, spec sections, screen IDs, acceptance criteria, crossings.

The Linear tools may be named `mcp__linear__*` or `mcp__claude_ai_Linear__*`, depending on how Linear was connected. Use whichever exists.

## 1. Read only what the problem points to

1. **Find the screen, function or table.**
   - **Screen:** find its row in `docs/SCREENS.md` (ID, file, route, what it needs). Its markup is `design/canvas/project/<file>`. Read that file for exact copy and structure; ignore sample names, numbers and stories, and inline SVG paths.
   - **Rules, flows, data model, AI and speech pipelines:** find the section in `docs/PLAN.md`. Grep `^## ` and `^### ` with line numbers, then Read only that section.
   - **Table:** `packages/db/src/schema.ts`.
   - **Shared shapes:** `packages/contracts/src/index.ts`.
   - **Level, tries, pass rule:** `packages/levels/src/index.ts`.
   - **Past decisions:** `docs/adr/`.
2. **Read the code involved,** if it exists yet: the route, component, package function or migration involved. Read only the shared parts (`packages/ui`, `packages/contracts`, `packages/db`) that bear on the problem. Do not map the repository.
3. **Collect evidence for every claim** as `path:line`, from code, a spec or a design file. A problem you can't point at in a file or a screenshot does not go in the issue.
4. **Check the golden rules** in `AGENTS.md`. If the problem touches one (mastery computed in code, no names or audio to models or logs, audio discarded, authorization layer, server-side scoring, levels only in `packages/levels`, checked stories, no fake data, secrets), say which, and make it a criterion.
5. **Look for overlap** before writing anything new:
   - `list_issues` on team BB with a few keywords from the problem, for issues that are not Done or Canceled
   - `git fetch origin`, then `git branch -a`, for branches whose name contains a related issue ID
   - `gh pr list` if `gh` is installed. If it isn't, skip it and say so.

   If an open issue already covers the problem, say so and offer to add to it instead. If in-progress work changes the same files, the new issue builds on it and lists it under **Depends on**.

## 2. One issue, one owner area

Each problem becomes one issue in one area:

| Area                           | Folders                                                                                       | Owner |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ----- |
| Platform and accounts          | `packages/db/**`, `packages/contracts/**`, `.github/**`, root config, `docs/adr/**`           | Rhett |
| Speech and reading analysis    | `packages/speech/**`                                                                          | James |
| AI teacher and learning engine | `packages/levels/**`, `packages/mastery/**`, `packages/story-ai/**`, `packages/teacher-ai/**` | Jhade |
| Product experience             | `apps/web/**`, `packages/ui/**`, `design/**`, `docs/**` (except `docs/adr`)                   | Sean  |

- **Area:** pick the area that owns most of the files the fix touches.
- **Reviewer:** the owner of the other area the change touches most. If it stays in one area, ask Sean to review, or Rhett when Sean owns the area.
- **Crossings:** files outside that area go under **Crossings**, and the owner of that area reviews them. A new field in `packages/contracts`, a new prop on a shared `packages/ui` component, a schema column or a new error type is a crossing, not a second issue.
- **Locked areas** (`packages/contracts`, `packages/db`, the authorization layer, consent and retention rules, anything that sends data to a model or speech provider; see `AGENTS.md`): add the line "Locked area" to the body and, if a label for it exists in `list_issue_labels`, add the label. The first criterion is "spec or schema change reviewed by the owner on the other side".
- **Splitting** is the exception. If one issue really can't hold the work (for example, the schema must merge before the screen can start), say so in the preview and ask before splitting. If the message holds problems for different areas, propose one issue per area, preview them together, and let one go create all of them.

## 3. Show the preview

Show the whole issue exactly as it will appear in Linear, then the questions. Do not call any Linear write tool in this phase.

### The issue body

Follow this shape. Leave out any line or section that has nothing in it.

```markdown
**Area:** Product experience (`apps/web/**`)
**Owner:** Sean
**Reviewer:** Rhett
**Screens:** A2 Create an account (`design/canvas/project/A2-CreateAccount.dc.html`), route `/sign-up`
**Specs:** `docs/PLAN.md` › 9 Accounts, privacy and compliance
**Depends on:** BB-8 (age gate). Sections 1 and 2 can start now.

One short paragraph: what is wrong or missing, where it was seen, and at what width. If the fix departs from the design, add: "Where this issue and `design/canvas/project/<file>` disagree, this issue wins. Keep the design's copy."

## 1. <the first problem, in a few words>

Two or three sentences on what is wrong, with `path:line` evidence.

- [ ] One testable criterion per line
- [ ] Another

## 2. <the next problem>

...

## Crossings (Rhett reviews)

- `path/outside/the/area.ts`, and why it changes

## Done

- [ ] Every box above checked at 1280px wide, and at 390px wide for pages that must work on a phone
- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass
- [ ] The PR has screenshots of <the states that prove it>, or test output for non-UI work

<If something can only be checked with a real microphone, a real child's voice or a real speech provider, say what, and that it is a manual check.>
```

The Screenshots section is added on go, after the upload.

**Writing rules:**

- Plain English, short sentences, active voice.
- Sentence case for titles and headings.
- No em dashes or en dashes, no emoji.
- Times as `8:00 PM`. Levels as "Level 24 of 100".

Each criterion is something a reviewer can check by looking or by running a command. "Works better" is not a criterion. "Choosing an age of 11 on sign-up shows the guardian email field and keeps reading aloud off until a guardian approves" is.

### Under the issue

1. **Fields:**
   - title (sentence case, under 70 characters)
   - type label: `Feature`, `Improvement` or `Bug` (check `list_issue_labels` for what exists)
   - project: "BasaBridge v1"
   - milestone: M0 Foundations, M1 Accounts, M2 Reading loop without voice, M3 Voice, M4 Full product or M5 Pilot readiness. Pick the one whose "Done when" the issue serves.
   - priority: 1 Urgent (blocks the team today), 2 High (blocks other issues), 3 Medium (normal), 4 Low (polish)
   - estimate, only if the BB team uses estimates: 1, 2, 3, 5 or 8 points; anything bigger needs a split
   - blocked by
   - related to
2. **Owner:** from the area table, so the issue is assigned to them.
3. **Screenshots** you will attach, by file path.
4. **Questions.** Ask only what changes the issue: scope, which of two fixes, whether to go beyond the design or spec, whether something belongs in a later issue. Number them, and give each your recommendation and a one-line reason. Never ask something the code, specs or design already answer.
5. End with: "Say go to create it, go with changes, or tell me what to change."

- "go" accepts every recommendation.
- "go, but X" applies X first.
- Anything else: revise the preview, show it again and wait.

## 4. On go

### Create the issue

`save_issue` with:

- team BB, the project, the milestone, the title, the body without the Screenshots section
- `labels`, `priority`, `estimate` (if used), `blockedBy`, `relatedTo`
- `assignee`: the area owner, matched by name with `list_users` (if the match is unclear, leave it unassigned and say so)

It lands in Backlog. Linear returns `BB-<n>`.

If the Linear tools are missing or ask for sign-in, stop before creating anything. Tell the user to connect Linear (in Claude Code, run `/mcp`; in the desktop app, use the connector settings) and make sure it points at the seanmyk workspace, then say go again.

### Attach the screenshots

A pasted image shows its file in the conversation as `[Image: source: <path>]`. Use that path, or a path the user gave. If an image has no path, say so after creating the issue and ask the user to save it to a file.

For each image, one at a time, finish all three steps before starting the next. The upload link expires 60 seconds after step 1.

1. **Prepare.** Get the size with `wc -c < "<path>"`. Call `prepare_attachment_upload` with the issue, a short file name such as `b4-analysis.png`, the content type and the size. Give it a title that says what the image shows.
2. **Upload** the bytes with curl, copying the URL and every header from `uploadRequest` exactly:

   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" -X PUT --data-binary @"<path>" \
     -H "content-type: image/png" \
     -H "cache-control: public, max-age=31536000" \
     -H "x-goog-content-length-range: <size>,<size>" \
     -H 'Content-Disposition: attachment; filename="<name>.png"' \
     "<uploadRequest.url>"
   ```

   Anything but 200 means start again at step 1. A 403 almost always means a header was changed or left out.

3. **Attach.** Call `create_attachment_from_upload` with the issue, the `assetUrl` and the same title.

Then put the images in the body, so they show where people read. Use `save_issue` to insert this before the first numbered section:

```markdown
## Screenshots

<One line saying what the images show and at what width.>

![<title>](assetUrl)
```

## 5. Report back

A short message:

- the Linear link and `BB-<n>`
- the area, owner and reviewer
- how many screenshots were attached, and any that could not be
- anything to know before it is picked up, such as an issue or branch it builds on
