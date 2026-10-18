# Threat model (BB-41)

Status: draft for review. Owner: Rhett. Reviewers: James (audio, speech), Jhade (AI prompts).

This is a release gate. No pilot with real children until every risk rated high is fixed or has an accepted reason signed by its owner.

Sources: `docs/PLAN.md` sections 7, 8, 9 and 13, `docs/adr/0002-story-model.md`, `packages/db/src/schema.ts`.

## What we protect

- Children's accounts: username, password hash, age band, optional email.
- Guardian emails and approval status.
- Reading audio. Kept only when retention is on, for 30 days.
- Reading analysis, answers, ability estimates and decisions. Together these describe a child's ability.
- Parent links and share choices.

## Who might attack

- A stranger online who wants to contact or profile a child.
- A classmate or sibling who wants to see or change another learner's results.
- An adult who pretends to be a parent or guardian.
- A bot that creates accounts or runs up AI cost.
- A provider (model, speech, hosting) that keeps or reuses data beyond what we need.
- An insider with database or log access.

## Severity

- **High:** a child's data reaches someone it should not, or the under-13 rule can be bypassed. Blocks the pilot.
- **Medium:** limited exposure or abuse that needs a fix before general launch.
- **Low:** hardening.

## Risks

Each risk has an ID, so a Linear issue can point at it. Status is "open" until the fix is merged and checked.

### Accounts

| ID  | Risk                                                                                    | Severity | Owner | Fix or accepted reason                                                                                                                 | Tracked |
| --- | --------------------------------------------------------------------------------------- | -------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| A1  | A child lies about age to skip guardian approval.                                       | High     | Rhett | Accepted reason needed from the privacy review. Self-declared age is the norm, but the reviewer must agree it is enough under the DPA. | BB-41   |
| A2  | Password guessing on accounts with weak passwords.                                      | Medium   | Rhett | Rate limit sign-in per username and per IP. Minimum length. Hash with a slow algorithm (argon2id or bcrypt).                           | BB-63   |
| A3  | Usernames that contain a real name, school or phone number.                             | Medium   | Rhett | Username filter for personal details and offensive words. Usernames never go to a model or a log.                                      | BB-63   |
| A4  | Recovery code stolen or guessed.                                                        | Medium   | Rhett | Shown once, stored hashed, single use, rate limited.                                                                                   | BB-62   |
| A5  | Bots create accounts and run up AI cost.                                                | Medium   | Rhett | Bot protection on sign-up, daily cost cap per learner.                                                                                 | BB-63   |
| A6  | Approval email sent to an address the child controls, so the child approves themselves. | High     | Rhett | Accepted reason or stronger check needed from the privacy review. At least: the approval page states who it is for and what it allows. | BB-41   |
| A7  | Guardian email kept after it is no longer needed.                                       | Low      | Rhett | Keep only while the approval is active. Delete with the learner.                                                                       | BB-41   |

### Link codes and parent access

| ID  | Risk                                                            | Severity | Owner | Fix or accepted reason                                                                               | Tracked |
| --- | --------------------------------------------------------------- | -------- | ----- | ---------------------------------------------------------------------------------------------------- | ------- |
| L1  | Link code guessed by brute force.                               | High     | Rhett | Random code with enough entropy (at least 40 bits), rate limit redemption, expire after 24 hours.    | BB-9    |
| L2  | Link code reused after it was redeemed.                         | High     | Rhett | `used_at` set in the same transaction as the link. Second use fails.                                 | BB-9    |
| L3  | A stranger gets a code from the child and links as a parent.    | Medium   | Rhett | The learner sees who linked and can revoke at any time. Accepted reason: the learner chose to share. | BB-9    |
| L4  | A parent sees more than the learner chose to share.             | High     | Rhett | Share flags checked in the authorization layer on every read, not in the page.                       | BB-10   |
| L5  | A revoked parent keeps access through a cached page or session. | Medium   | Rhett | Every read checks link status. No long-lived caches of learner data for parents.                     | BB-10   |

### Authorization

| ID  | Risk                                                                                  | Severity | Owner | Fix or accepted reason                                                                     | Tracked |
| --- | ------------------------------------------------------------------------------------- | -------- | ----- | ------------------------------------------------------------------------------------------ | ------- |
| Z1  | A route reads learner tables directly and skips the authorization layer.              | High     | Rhett | Lint rule or test that fails when app code imports learner tables outside the layer.       | BB-10   |
| Z2  | A learner changes an ID in a request and reads another learner's sessions or answers. | High     | Rhett | Learner ID comes from the session, never from the request. Tests for cross-learner reads.  | BB-10   |
| Z3  | The browser sends a score, a try count or a "voice approved" flag.                    | High     | Rhett | The server scores, counts tries and checks approval. Request fields for these are ignored. | BB-10   |

### Audio

| ID  | Risk                                                             | Severity | Owner | Fix or accepted reason                                                                                       | Tracked |
| --- | ---------------------------------------------------------------- | -------- | ----- | ------------------------------------------------------------------------------------------------------------ | ------- |
| U1  | Audio recorded before guardian approval for an under-13 learner. | High     | James | Server refuses speech sessions until approval is `approved`. The browser gate is only a convenience.         | BB-30   |
| U2  | Audio kept after analysis when retention is off.                 | High     | James | Audio lives in memory for the call only. A test checks no `audio_objects` row is written with retention off. | BB-30   |
| U3  | Retained audio not deleted after 30 days.                        | High     | James | Scheduled job deletes the object and the row at `expires_at`. Storage lifecycle rule as a backstop.          | BB-30   |
| U4  | The speech provider keeps or trains on audio.                    | High     | James | Provider terms checked (`provider-terms.md`). Use a no-retention, no-training option or switch provider.     | BB-41   |
| U5  | Audio reaches a parent.                                          | High     | James | No parent route returns audio or a storage key. Test in the authorization layer.                             | BB-10   |
| U6  | Retained audio readable by anyone with the storage URL.          | Medium   | James | Private bucket, short-lived signed URLs for the learner only.                                                | BB-30   |

### AI prompts

| ID  | Risk                                                                    | Severity | Owner | Fix or accepted reason                                                                                              | Tracked             |
| --- | ----------------------------------------------------------------------- | -------- | ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| P1  | A name, username or email ends up in a story, verifier or notes prompt. | High     | Jhade | Prompt builders take typed inputs with no identity fields. A test inspects every built prompt for forbidden fields. | BB-15, BB-20        |
| P2  | Gemini or the AI Gateway uses prompts for training or keeps them.       | High     | Jhade | Provider terms checked (`provider-terms.md`). Switch tier or provider if unsuitable.                                | BB-41               |
| P3  | A generated story is unsafe for children.                               | High     | Jhade | Deterministic checks, independent verifier, evaluation safety set.                                                  | BB-16, BB-17, BB-21 |
| P4  | A learner injects text into a prompt.                                   | Low      | Jhade | Learners never type into prompts. Inputs are levels, topic seeds, counts and word differences only.                 | BB-15               |
| P5  | Teacher notes show text that is not validated.                          | Medium   | Jhade | zod validation and standard fallback wording.                                                                       | BB-20               |

### Logs

| ID  | Risk                                                                 | Severity | Owner | Fix or accepted reason                                                                   | Tracked |
| --- | -------------------------------------------------------------------- | -------- | ----- | ---------------------------------------------------------------------------------------- | ------- |
| G1  | Usernames, emails or prompts written to application or hosting logs. | High     | Rhett | Logger with an allowlist of fields. Log user IDs, never usernames or emails.             | BB-41   |
| G2  | Error tracking captures request bodies with personal data or audio.  | High     | Rhett | Strip bodies and headers before sending errors. Never attach audio.                      | BB-41   |
| G3  | The AI Gateway logs prompts and outputs.                             | Medium   | Jhade | Check what the gateway keeps (`provider-terms.md`). Turn off prompt logging if possible. | BB-41   |
| G4  | `audit_log` itself becomes a store of personal data.                 | Low      | Rhett | Store actor ID, action and target ID only.                                               | BB-41   |

### Exports and deletion

| ID  | Risk                                                                                                                                | Severity | Owner | Fix or accepted reason                                                                                          | Tracked |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- | --------------------------------------------------------------------------------------------------------------- | ------- |
| E1  | An export includes another learner's data or a parent's email.                                                                      | High     | Rhett | Export built through the authorization layer for the signed-in user only.                                       | BB-41   |
| E2  | Deleting a learner leaves rows behind.                                                                                              | High     | Rhett | `on delete cascade` on learner tables (present in the schema). A test deletes a learner and checks every table. | BB-41   |
| E3  | Deleting a learner leaves retained audio in storage.                                                                                | High     | James | Delete storage objects before the rows. Lifecycle rule as a backstop.                                           | BB-30   |
| E4  | Backups keep deleted data indefinitely.                                                                                             | Medium   | Rhett | State the backup retention period in the privacy notice. Accepted reason: backups expire on a schedule.         | BB-66   |
| E5  | `reading_sessions.story_id` and `answers.question_id` have no cascade, so a story cannot be deleted while learner rows point at it. | Low      | Rhett | Accepted: stories hold no personal data. Learner rows go with the learner.                                      | None    |

## What this does not cover

- Operating duties under the Data Privacy Act (data protection officer, breach response, registration, cross-border transfer): BB-66.
- Speech accuracy and fairness on children's voices: BB-22, BB-40.

## How to close this

1. Each open high risk gets a Linear issue, or points at an existing one in the Tracked column.
2. The qualified reviewer signs off on A1, A6, U4 and P2 (see `privacy-review-brief.md`).
3. The owner updates the row to "fixed" with how it was checked, or to "accepted" with the reason and their name.
