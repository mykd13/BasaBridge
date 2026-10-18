# Student engine API

For the screen sessions (BB-31 to BB-33, BB-51). The engine is `packages/engine`. The routes are thin wrappers in `apps/web/src/server/engine` and `apps/web/src/app/api/engine`. Every shape is a zod schema in `@basabridge/contracts/engine`. Import types from there.

The server owns scoring, tries, the pass rule, level movement, placement steps and the under-13 microphone gate. The screen shows what the server says and sends what the learner did. Never copy a level number, a tries count or the pass rule into a screen.

## Rules every screen can rely on

- All routes need a signed-in learner. No session answers 401. Until the auth and database wiring land, every route answers 503 `{ "error": "not_configured" }`.
- Errors are `{ "error": "<code>" }`. The codes are in `EngineErrorCode`. 403 and 409 codes are rules, not bugs: show the matching screen.
- Answer keys and evidence sentences never appear in a session or placement view. They come back only in the feedback for an answer already given (not in placement).
- Responses are `cache-control: no-store`.
- Ids in paths are uuids.

## Reading session

A session is one learner reading one story. Its `status` is `reading`, `answering` or `done`. `next` says what to show:

| `next`             | Show                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| `read`             | The read screen. No finished try yet.                                                |
| `read_or_continue` | Analysis of the last try with "Read again" (if `triesLeft` is not 0) and "Continue". |
| `answer`           | The next unanswered question in `questions` (`answeredQuestionIds` says which).      |
| `new_story`        | The result (`result`). Offer the new story button.                                   |

| Method and path                           | Body                  | Returns                                |
| ----------------------------------------- | --------------------- | -------------------------------------- |
| `GET /api/engine/session`                 | none                  | `SessionView` or `null` (resume)       |
| `POST /api/engine/session`                | none                  | `SessionView`: new, or the resumed one |
| `GET /api/engine/session/{id}`            | none                  | `SessionView`                          |
| `POST /api/engine/session/{id}/try`       | `SubmitTryRequest`    | `SessionView`                          |
| `POST /api/engine/session/{id}/continue`  | none                  | `SessionView` (now `answering`)        |
| `POST /api/engine/session/{id}/answer`    | `SubmitAnswerRequest` | `AnswerFeedback`                       |
| `POST /api/engine/session/{id}/new-story` | none                  | `SessionView`                          |

Rules:

- **Start** is locked until placement is done or skipped (403 `placement_required`). If the learner has an unfinished session, start returns it, so a reload resumes. Use `GET /session` on page load.
- **Try.** Voice: send `{ "mode": "voice", "captureId": "...", "listened": false }`. The capture id comes from the speech capture flow. The server loads the analysis from the speech pipeline itself, once. The browser never sends words right or any score. Silent: `{ "mode": "silent" }` is the only mode for a learner without microphone approval (voice then answers 403 `mic_not_allowed`). A learner who may use the microphone must say why they cannot read aloud: `{ "mode": "silent", "micState": "blocked" }` (or `unavailable`). Without it the server answers 403 `voice_required`. Silent reads never move a level up.
- **Counted try.** Only a try that reaches the end can count. The learner picks "Continue" (the best finished try counts) or reads again while `triesLeft` is not 0. When tries run out the best finished try counts and the session goes to `answering` by itself. If no try finished, the session ends `done` with `result.outcome = "stopped_early"` and `next = "new_story"`. `triesLeft` is `null` for unlimited levels.
- **Listen then read.** Send `listened: true` only when the learner heard the story first. The server marks the try `supported` only at the levels where it is allowed. Supported tries show the "after listening" label. Answers after a supported try carry the `supported_try` accommodation and count for less.
- **Answer.** `chosen` is one index for multiple choice, any set of indexes for choose-all, and all indexes in story order for order-events. `responseMs` is the time from showing the question to the pick. Accommodations: send `question_read_aloud` when it was used. Do not send `supported_try` or `word_tap` (403 `accommodation_not_allowed`). `AnswerFeedback` has `correctIndexes`, `evidence`, `offerLearn` (small Learn link under this wrong answer, once per quiz) and, on the last answer, `result`.
- **Result.** `outcome` is `passed`, `not_passed` or `stopped_early`. `moved` and `levelAfter` come from the evidence rules. `learn.onResult` says whether to show the Learn button. `focusSkill` is chosen by code. `voiceEvidence: false` means the read was silent or needed review, so it could not move the level up. A silent read is judged on the questions alone.
- **New story.** After `done`. The new story is at the learner's level, which is the same difficulty unless the evidence moved it. Stories do not repeat while the bank has others.

## Placement

Required before the main course. Two to four stories, one try each. No listen-then-read, no word tap, no question read-aloud, no Learn. `PlacementView.supports` is always all false. Answers get no right or wrong feedback.

| Method and path                          | Body                     | Returns                                                   |
| ---------------------------------------- | ------------------------ | --------------------------------------------------------- |
| `GET /api/engine/placement`              | none                     | `{ gate: PlacementGate, current: PlacementView or null }` |
| `POST /api/engine/placement`             | none                     | `PlacementView`: new, or the resumed one                  |
| `GET /api/engine/placement/{id}`         | none                     | `PlacementView`                                           |
| `POST /api/engine/placement/{id}/read`   | `PlacementReadRequest`   | `PlacementView`                                           |
| `POST /api/engine/placement/{id}/answer` | `PlacementAnswerRequest` | `PlacementAnswerAck`                                      |
| `POST /api/engine/placement/skip`        | none                     | `PlacementGate`                                           |

- **Gate.** `required` is true until placement is completed or skipped. `due` is true after a skip, and after a silent placement once voice is approved. `canRetake` is true 30 days after finishing, or when `due`. Starting a finished placement that cannot be retaken answers 409 `placement_done`.
- **Flow.** `status` goes `reading` (send the read), `answering` (send each answer), and back to `reading` with the next story, until `done`. When `done`, `result` is the `PlacementResult` (level, confidence, flags, recommended reading help) and the learner's level is already set.
- **Read.** `voice` with a capture id, `silent`, or `voice_failed` when the device or upload failed. A failed or unusable recording is offered again once (`retryRead: true`), then the story is skipped. A failed read is never scored as zero.
- **Under-13 without approval.** `voiceMode` is `silent`. The result carries `voice_missing`, its confidence is capped at `early`, and `voiceRecheckDue` is true. Once voice is approved the gate says `due` and the learner can start a short re-check.
- **Skip.** Starts the learner at the grade default with low confidence and asks again. Answers 409 `placement_done` once placement is completed or already skipped, so earned progress is never reset. Skipping during a retake just abandons the retake. The silent read rule above applies to placement reads too.

## Concurrency

Sessions and placements carry a `version`. Repositories must reject a save based on a stale copy with 409 `conflict` (the screen should reload the view). The engine saves the session or placement first and writes learner progress only after that succeeds. `responseMs` is capped at 10 minutes on the server.

## What is behind a seam

The engine talks only through the interfaces in `packages/engine/src/types.ts`. The app supplies them:

| Seam                               | What it is                                                                    | Status               |
| ---------------------------------- | ----------------------------------------------------------------------------- | -------------------- |
| `ContextResolver` (apps/web)       | Reads the sign-in, checks the learner role, builds `EngineDeps`.              | Not wired (auth PRs) |
| `LearnerRepository`                | Profile (grade, `micAllowed`, listen setting), progress, placement state.     | Interface only       |
| `SessionRepository`                | `reading_sessions`, `tries`, `answers`. Atomic `save`, stale writes rejected. | Interface only       |
| `PlacementRepository`              | `placement_sessions`.                                                         | Interface only       |
| `StoryBank` and `placementStories` | Checked stories with tagged questions and the key.                            | Interface only       |
| `AnalysisSource`                   | Analysis of a finished capture from the speech pipeline, once, owner-checked. | Interface only       |

Test doubles are in `@basabridge/engine/testing`. They are for tests and local wiring, not for production.

### Rows the database needs (packages/db is locked, no migration is included)

- `learner_progress` per learner: `level`, `passed_stories`, `recent_words_right` (jsonb numbers), `posterior` (jsonb: weights and items), `history` (jsonb: the last twenty finished stories as `{ questions: [{ skill, correct }] }`). The `learners` table has level and passes but not the ability belief.
- `learners.placement_state` (`none`, `in_progress`, `completed`, `skipped`), `placement_finished_at` and `placement_result` (jsonb `PlacementResult`). `placement_sessions` already exists. Its `progress` jsonb holds the per-story records.
- `answers.chosen` must become jsonb before choose-all and order-events answers can be stored (already noted in `AnswerRecord`).
- `tries` needs `supported` (bool) and `needs_review` (bool). `wordsRightShare` can be derived from `words_right` and `words_total`.
- `questions` already has `subskill`, `type`, `distractors` and `difficulty`. The answer key for choose-all and order-events needs a column (`answer_key` jsonb) or a mapping into `StoredQuestion.key`.
- `reading_sessions.voice_mode` and `inline_offers_shown`, or keep them in a jsonb column.

## Not done here

- Real repositories, the story bank and the analysis source (they wait on the migrations, BB-18 and BB-24).
- Decision log entries (`decisions` table) for level moves and placement. The result carries the evidence; writing the rows belongs in the repository layer.
- Teacher notes and the Learn plan after a result. The result gives `focusSkill`, `learn.onResult` and `nextStoryLevel` for those.
- The authorization layer (BB-10) and an Origin check. The resolver is where both go.
