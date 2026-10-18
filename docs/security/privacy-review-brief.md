# Privacy review brief (BB-41)

Status: ready to send. Owner: Rhett and James.

This brief is for a person qualified in the Philippine Data Privacy Act of 2012 (RA 10173) and children's data. It explains what BasaBridge collects and asks specific questions. The review is a release gate: no pilot with real children until it is done.

## The product in one paragraph

BasaBridge helps students read English stories for meaning. A learner reads a short story aloud, code compares what was said with the text, and the learner answers questions. Levels move by rules in code. Parents are optional and see only what the learner chooses to share.

## What we collect

| Data                          | Why                        | Where it goes                       | How long                                                                           |
| ----------------------------- | -------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- |
| Username, password hash       | Sign in                    | Our database                        | Until the account is deleted                                                       |
| Age band (not birth date)     | Under-13 rule              | Our database                        | Until the account is deleted                                                       |
| Email (optional)              | Password reset             | Our database, email provider        | Until removed or the account is deleted                                            |
| Guardian email (under 13)     | Approval request           | Our database, email provider        | While the approval is active                                                       |
| Reading audio                 | Reading analysis           | Speech provider, in the moment      | Discarded after analysis. If the learner turns retention on: 30 days, then deleted |
| Words heard, timings, scores  | Feedback and levels        | Our database                        | Until the account is deleted                                                       |
| Answers and ability estimates | Levels and lessons         | Our database                        | Until the account is deleted                                                       |
| Story text, level, counts     | Story generation and notes | Google Gemini via Vercel AI Gateway | Per provider terms (see `provider-terms.md`)                                       |

No names, usernames, emails or audio are sent to an AI model. Parents never receive audio.

## Questions for the reviewer

### 1. The under-13 approval rule

Rule today: a learner who says they are under 13 enters a parent or guardian email. That person gets an approval request. Until it is approved, the learner can read silently and answer questions. Voice recording and reading analysis wait for approval.

- Is guardian email approval enough consent for a child under 13 under the DPA and NPC guidance?
- Is 13 the right age, or should it be 18 for some processing (for example, audio)?
- Is silent reading before approval acceptable, given it stores answers and ability estimates?
- Age is self-declared. Is that acceptable, and what extra step, if any, is expected?
- The guardian email could belong to the child. What check is reasonable (threat model A1, A6)?

### 2. Consent text

- Draft consent and privacy notice text will be attached once written (BB-8). Does it meet the transparency requirements, in plain language a child and a parent can follow?
- Does consent need to be recorded per purpose (account, audio, sharing with a parent)? The `consents` table stores kind and version.
- Do we need consent in Filipino as well as English? The interface already supports both.

### 3. Retention and deletion

- Is 30 days for retained audio reasonable, and is opt-in by the learner (not the guardian) acceptable?
- Learners and parents can export and delete their data. Is deletion on request, with backups that expire on a schedule, enough?
- How long may we keep reading results after a learner stops using the app?

### 4. Data sent to model and speech providers

- Story and notes prompts carry levels, topic seeds, story text, counts and word-level differences. Is any of this personal data in combination?
- Audio goes to a speech provider for analysis. What terms must the provider meet (no training, no retention, location)?
- Providers may process data outside the Philippines. What is needed for cross-border transfer (tracked in BB-66)?

## Findings

The reviewer fills this in. Each finding becomes a Linear issue.

| ID  | Finding | Severity (high, medium, low) | Change needed | Linear issue |
| --- | ------- | ---------------------------- | ------------- | ------------ |
|     |         |                              |               |              |

Reviewer name and qualification:

Date:

## After the review

1. Each finding is tracked as a Linear issue. None rated high stays open before the pilot.
2. The privacy notice and consent text are finalised from the findings (BB-8).
3. The threat model rows A1, A6, U4 and P2 are updated with the reviewer's decision.
