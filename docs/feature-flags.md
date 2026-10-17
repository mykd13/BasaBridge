# Feature flags and staging

Flags switch risky features on and off without a deploy. They are part of BB-65.

## How flags work

- The flag list, the safe defaults and the checks live in `apps/web/src/server/flags.ts`.
- Stored values live in the `feature_flags` table. Only changed flags have a row.
- Every change writes a row to `feature_flag_changes` with the old value, the new value, the user id of whoever changed it (or none for a team script) and the time. No names are stored.
- Flags are read on the server only. Never import `flags.ts` into a client component.
- A read is reused for 30 seconds. A change takes effect within that time.
- If a row is missing, a value is invalid or the database cannot be read, the app uses the safe default.

## The flags

| Flag                  | Default | What it controls                                                                                 |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `microphone`          | on      | Kill switch for voice recording and reading analysis for everyone. Turn it off if speech breaks. |
| `listen_then_read`    | off     | Offer to play the story aloud before the learner reads it.                                       |
| `spoken_instructions` | off     | Spoken interface instructions.                                                                   |
| `placement`           | off     | The placement test for new learners.                                                             |
| `model_choices`       | none    | Overrides `STORY_MODEL`, `VERIFIER_MODEL` and `NOTES_MODEL`. None means use the variables.       |

The under-13 guardian gate (BB-8) is not a flag. It is enforced in code, and no flag can turn it off.

`microphone` is on by default because it is a kill switch for the core feature. Turning it off is the safe action. New features start off.

## Read a flag

```ts
import { getFlag } from '@/server/flags';

if (await getFlag('listen_then_read')) {
  // offer listen-then-read
}
```

## Change a flag

Call `setFlag` from server code or a one-off script run by the team:

```ts
import { setFlag } from '@/server/flags';

await setFlag('placement', true, actorUserId); // actorUserId is null for a team script
```

`setFlag` refuses unknown flags and invalid values, and logs every change. There is no admin screen yet.

## Add a flag

1. Add an entry to `FLAGS` in `apps/web/src/server/flags.ts` with a `default`, a `parse` check and a `description`.
2. Choose the safe default: off for a new or risky feature, on only for a kill switch that keeps normal behaviour.
3. Add tests in `apps/web/src/server/flags.test.ts` for the default and for a bad value.
4. Add a row to the table above.

No migration is needed. Flags are rows, not columns.

## Staging

The staging environment waits for BB-2 (the Vercel project linked to GitHub). When it exists, these rules apply:

- Staging has its own database and its own keys. It never shares production's.
- Staging runs `main` first. Production deploys are promoted from staging.
- Staging holds no real learner data.
- Staging is never used for testing with real children. Sessions with children use production under the BB-78 protocol.
