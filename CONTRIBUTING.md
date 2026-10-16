# Contributing

## Flow

1. Pick a Linear issue (BB-nn). Create a branch named `bb-nn-short-description`.
2. Keep changes inside your package where you can. Cross-package changes go through `packages/contracts`.
3. Open a pull request. CI must pass. One review is required; contract changes need a review from the owner on each side.
4. Squash merge into `main`. Main always deploys.

## Rules that matter here

- **Mastery is computed in code.** The AI explains results and never decides them.
- **No names, usernames or audio go to a model.** Prompts carry counts, levels and text only.
- **Audio is discarded after analysis** unless the learner turned retention on.
- **No fake data.** Screens start empty and fill from real activity. No seeded demo users in app code.
- **Anything with a learner id goes through the authorization layer** (BB-10). Do not query learner tables directly from a page.
- Level numbers, tries and the pass rule are placeholders. Change them in `packages/levels` only.

## Checks before you push

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
