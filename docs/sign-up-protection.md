# Sign-up protection and daily caps

BB-63. Open sign-up sits on a paid AI and speech budget. This page explains how we keep bots and
heavy use from running up cost, and what a learner sees when a cap is reached.

The rules live in code. The numbers live in configuration, so they can change without a deploy
of new code.

## What is built and what is waiting

| Piece                                         | Where                                         | State                                              |
| --------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Username filter                               | `apps/web/src/server/auth/username-filter.ts` | Built, tested                                      |
| Account tier rule                             | `apps/web/src/server/limits/tier.ts`          | Built, tested                                      |
| Daily cap decision                            | `apps/web/src/server/limits/caps.ts`          | Built, tested                                      |
| Bot check (ALTCHA)                            | `apps/web/src/server/auth/bot-check.ts`       | Built, tested                                      |
| Sign-up wiring and per-network limit          | `apps/web/src/server/auth`                    | Waits for BB-7 (auth) and BB-39 (limits)           |
| Cap gate for stories, speech and server voice | `apps/web/src/server/limits`                  | Waits for BB-39, BB-10, BB-57, BB-15 and BB-24     |
| Screens and catalog text                      | `apps/web`                                    | Waits for BB-12 (account screens) and BB-58 (i18n) |

## Bot check

Sign-up uses ALTCHA, a proof-of-work check that we host ourselves.

- The browser solves a small puzzle in the background while the child fills in the form. There is
  nothing to read, type or click.
- No third party sees the request, so the check adds no new data processor (BB-41).
- Each solved challenge works once and expires after 10 minutes.
- The work is kept small so a low-end phone finishes in about a second. The per-network limit
  below does the rest.
- A failed check returns the code `BOT_CHECK_FAILED`.

## Per-network sign-up limit

Sign-up is counted per network address with the BB-39 rate limits. The address is stored only as
a keyed hash. Past the limit, sign-up returns `SIGN_UP_LIMITED` and the hit is logged as
`limit.hit`.

## Username filter

A username may hold letters and numbers only, as the create account screen says. The filter then
refuses:

| Code                 | Refused                                                        | The screen asks the child to        |
| -------------------- | -------------------------------------------------------------- | ----------------------------------- |
| `USERNAME_CHARS`     | Spaces, symbols, letters outside A to Z                        | use letters and numbers only        |
| `USERNAME_PHONE`     | Seven digits in a row, or nine digits in all                   | take out the phone number           |
| `USERNAME_OFFENSIVE` | Offensive words in English and Filipino, including look-alikes | pick kinder words                   |
| `USERNAME_SCHOOL`    | School names and school abbreviations                          | take out the school name            |
| `USERNAME_FULL_NAME` | A common first name next to a common surname                   | pick a made-up name, not a real one |

The result is a code only. The filter never returns the word it matched, so neither a screen nor
a log can repeat it. The word lists are in `username-words.ts` and are a starting list for review.

## Daily caps per learner

Every AI and speech call is metered by BB-39 into `ai_calls`. Today's spend for a learner is the
sum since midnight in the Philippines. Before each story, speech analysis or server voice request,
the app checks the global budget, then the learner's budget, then the learner's rate limit.

Past a cap, learning goes on without new cost until midnight in the Philippines:

| Request      | Past the cap                                                                       |
| ------------ | ---------------------------------------------------------------------------------- |
| New story    | A story from the story bank                                                        |
| Speech       | Silent reading: the learner reads and answers questions without the microphone     |
| Server voice | The browser's own voice, as the speak button already does when the service is down |

Every refusal carries the notice code `DAILY_LIMIT` and the time the cap lifts. The screen shows a
friendly "come back tomorrow" message from the i18n catalog. If spend cannot be read, the check
refuses, so an outage never runs up cost.

Every cap hit is logged as `cap.hit` with the kind, tier and reason, and written to `ai_calls`
with the outcome `limited`. No username is logged.

## New accounts with no email

An account with no email starts in the `new` tier. It moves to `standard` once it has an email
or finishes its first story. The `new` tier has a lower daily budget and lower per-learner rate
limits. The `new` budget can never be set higher than the standard one.

## Configuration

These are added to `example.env` when the wiring lands. Values stay in `.env.local`.

| Variable                          | Meaning                                                                                       | Starting value      |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| `ALTCHA_HMAC_KEY`                 | Signs bot check challenges. At least 32 characters.                                           | none, required      |
| `RATE_LIMIT_SIGN_UP_PER_IP`       | Sign-ups per network address, as `<limit>/<seconds>`                                          | `5/3600`            |
| `AI_NEW_LEARNER_DAILY_BUDGET_USD` | Daily dollar cap for the `new` tier                                                           | `0.1`               |
| `RATE_LIMIT_<POLICY>_NEW`         | Per-learner limits for the `new` tier, for example `RATE_LIMIT_STORY_PER_LEARNER_NEW=3/86400` | lower than standard |

These come from BB-39 and are unchanged: `AI_LEARNER_DAILY_BUDGET_USD`, `AI_DAILY_BUDGET_USD`,
`RATE_LIMIT_<POLICY>` and `SPEECH_USD_PER_MINUTE`.

The starting values are guesses. BB-68 (cost model per learner) sets the real ones.

## How it was checked

- `pnpm --filter @basabridge/web test`: unit tests for the filter, the tier rule, the cap
  decision and the bot check.
- The filter tests check every listed word, look-alike spellings, ordinary names that must pass,
  and that no result contains the refused name.
- The bot check tests solve real challenges, then check that replayed, changed, expired and
  wrongly signed ones are refused.
- Still to check by hand: solve time of the bot check on a low-end phone.
