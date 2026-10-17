# @basabridge/contracts

The shapes that two owners exchange: stories and questions, reading sessions, tries, answers, analyses, plans, decisions and account events. Each shape is a zod schema with a matching TypeScript type, all in `src/index.ts`.

This is a locked area. Any change needs a review from the owners on both sides (see `.github/CODEOWNERS`). Say which sides in the pull request description.

## Add a shape

1. Add the schema to `src/index.ts` under the section it belongs to. Export the schema and its type with the same name:

   ```ts
   export const Thing = z.object({ id: z.string().uuid(), count: z.number().int().nonnegative() });
   export type Thing = z.infer<typeof Thing>;
   ```

2. Add tests in `src/schemas.test.ts`: one valid example and at least one invalid example per rule.
3. Run `pnpm --filter @basabridge/contracts test` and `pnpm typecheck`.
4. Tag the owners on both sides in the pull request.

## Rules

- No names, usernames, emails or audio in a shape that goes to a model, a speech provider or a log.
- Do not copy level numbers, tries or the pass rule here. They live in `packages/levels`.
- Prefer adding an optional field over changing an existing one, so older data still parses.
- Database tables mirror these shapes by hand. If you change a shape that is stored, check `packages/db` too.
