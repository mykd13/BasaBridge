## Issue

BB-<n> <issue title>

<!-- Linear link: https://linear.app/seanmyk/issue/BB-<n> if the GitHub integration does not add it -->

## What changed

<!-- One line per plan step. -->

## Screens

<!-- For UI issues: each screenshot from tmp/bb-<n>/ next to its design screen ID. 1280px for desktop, 390px where the page must work on a phone. Delete this section for non-UI work. -->

| Design                                                                  | Build    |
| ----------------------------------------------------------------------- | -------- |
| A2 Create an account (`design/canvas/project/A2-CreateAccount.dc.html`) | ![](...) |

## Acceptance criteria

<!-- Every criterion from the issue. Passed ones say how they were checked. Unchecked ones say what manual check they need. -->

- [x] <criterion>: <how it was checked>
- [ ] <criterion>: needs a manual check with <a real microphone, a real child's voice, a real speech provider, ...>

## Checks

- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass
- [ ] Golden rules hold: mastery in code, no names or audio to models or logs, audio discarded, authorization layer, server-side scoring, levels only in `packages/levels`, checked stories, no fake data, no secrets
- [ ] `packages/ui` tokens and components only; copy taken from the design file
- [ ] Stayed inside my area, or crossings are listed and the reviewer is tagged
- [ ] Locked area change: owner on the other side tagged and agreed (or N/A)

## Needs from others

<!-- Contract or schema changes, new dependencies, shared components, or a blocker this was built around. Write "None" if there are none. -->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
