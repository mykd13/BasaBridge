# Screens

Every screen on the design canvas (https://claude.ai/artifact/KparoB241FAMSRqcN9sn9S), with the file that holds its markup, where it should live in the app, and what it needs. The board ID (A1, B3, F2) is the one shown on the canvas. Routes are proposals until the screen is built.

Markup for each screen is in `design/canvas/project/<file>`. Use it for exact copy, structure and spacing. Ignore mockup-only parts: sample names, numbers and stories, and inline SVG paths.

The flow order is in `design/canvas/project/canvas.json`.

## A. Getting started

| ID  | Screen                 | File                       | Route      | Needs                                       |
| --- | ---------------------- | -------------------------- | ---------- | ------------------------------------------- |
| A1  | Sign in                | `Main.dc.html`             | `/sign-in` | auth (BB-7)                                 |
| A2  | Create an account      | `A2-CreateAccount.dc.html` | `/sign-up` | auth, age gate, consent (BB-7, BB-8, BB-11) |
| A3  | Student home and level | `S2-Home.dc.html`          | `/home`    | level, tries, latest note (BB-19)           |

## B. One reading session (1 of 2)

| ID  | Screen              | File                   | Route                | Needs                                   |
| --- | ------------------- | ---------------------- | -------------------- | --------------------------------------- |
| B1  | Making a story      | `S3-Loading.dc.html`   | `/read` (preparing)  | story bank, generation (BB-15 to BB-18) |
| B2  | Turn on microphone  | `S4-Mic.dc.html`       | `/read` (microphone) | capture (BB-23)                         |
| B3  | Reading aloud       | `S5-ReadAloud.dc.html` | `/read`              | capture, provider (BB-23, BB-24)        |
| B4  | AI reading analysis | `S6-Analysis.dc.html`  | `/read/analysis`     | alignment, pace, notes (BB-25 to BB-28) |

## C. One reading session (2 of 2)

| ID  | Screen                    | File                  | Route                        | Needs                                   |
| --- | ------------------------- | --------------------- | ---------------------------- | --------------------------------------- |
| C1  | Question                  | `S8-Question.dc.html` | `/read/questions`            | session state (BB-36). Story is hidden. |
| C2  | Answer feedback           | `S9-Feedback.dc.html` | `/read/questions` (answered) | server scoring. No quoted sentences.    |
| C3  | Result and level progress | `S11-Result.dc.html`  | `/read/result`               | mastery, notes (BB-19, BB-20)           |
| C4  | Level up                  | `S12-LevelUp.dc.html` | `/read/level-up`             | level movement (BB-19)                  |

## D. When things go differently

| ID  | Screen             | File                      | Route                | Needs                        |
| --- | ------------------ | ------------------------- | -------------------- | ---------------------------- |
| D1  | Stopped early      | `S7-StoppedEarly.dc.html` | `/read` (stopped)    | completion detection (BB-26) |
| D2  | Tries used up      | `S10-NewPhrase.dc.html`   | `/read` (tries used) | session rules (BB-36)        |
| D3  | Microphone blocked | `S13-MicBlocked.dc.html`  | `/read` (blocked)    | permission states (BB-23)    |

## E. Student account

| ID  | Screen              | File                         | Route            | Needs                                                     |
| --- | ------------------- | ---------------------------- | ---------------- | --------------------------------------------------------- |
| E1  | My progress         | `S14-MyProgress.dc.html`     | `/progress`      | mastery (BB-19)                                           |
| E2  | My account          | `A4-MyAccount.dc.html`       | `/account`       | auth, retention setting, export and delete (BB-13, BB-30) |
| E3  | Share with a parent | `A3-ShareWithParent.dc.html` | `/account/share` | link codes, share flags (BB-9, BB-10)                     |

## F. Optional parent flow

| ID  | Screen                      | File                    | Route                         | Needs                                 |
| --- | --------------------------- | ----------------------- | ----------------------------- | ------------------------------------- |
| F1  | Link a child                | `P1-AddLearner.dc.html` | `/parent/link`                | link codes (BB-9)                     |
| F2  | Parent progress             | `P2-Progress.dc.html`   | `/parent/[learner]`           | authorization (BB-10), notes (BB-20)  |
| F3  | Readings and AI analysis    | `P3-Readings.dc.html`   | `/parent/[learner]/readings`  | analysis shared, misheard fix (BB-29) |
| F4  | Levels and tries            | `P6-Levels.dc.html`     | `/parent/[learner]/levels`    | `packages/levels`                     |
| F5  | AI decisions                | `P4-Decisions.dc.html`  | `/parent/[learner]/decisions` | decisions log                         |
| F6  | Linked children and privacy | `P5-Data.dc.html`       | `/parent/[learner]/privacy`   | links, export and delete (BB-13)      |

## G. Placement test (before the main course)

| ID  | Screen                    | File                          | Route               | Needs                                                |
| --- | ------------------------- | ----------------------------- | ------------------- | ---------------------------------------------------- |
| G1  | Find my starting level    | `G1-PlacementIntro.dc.html`   | `/placement`        | placement engine, gating (BB-47, BB-49)              |
| G2  | Between placement stories | `G2-PlacementBetween.dc.html` | `/placement/next`   | resume state (BB-47, BB-49). No scores shown.        |
| G3  | Your starting level       | `G3-PlacementResult.dc.html`  | `/placement/result` | placement result, reading help preset (BB-47, BB-59) |

## H. Learn

| ID  | Screen                    | File                         | Route                       | Needs                                                |
| --- | ------------------------- | ---------------------------- | --------------------------- | ---------------------------------------------------- |
| H1  | Result: not passed, Learn | `H1-ResultNotPassed.dc.html` | `/read/result` (not passed) | gap mapping, Learn offers (BB-52)                    |
| H2  | Learn home                | `H2-LearnHome.dc.html`       | `/learn`                    | recommendations, lesson progress (BB-52, BB-53)      |
| H3  | Lesson: explain           | `H3-Lesson.dc.html`          | `/learn/[lesson]`           | reviewed lesson content (BB-53)                      |
| H4  | Lesson: practice          | `H4-Practice.dc.html`        | `/learn/[lesson]/practice`  | generated practice items (BB-54)                     |
| H5  | Lesson done               | `H5-LessonDone.dc.html`      | `/learn/[lesson]/done`      | recheck items added to next story (BB-52)            |
| H6  | Word practice: Say it     | `H6-SayIt.dc.html`           | `/learn/words`              | speech, flagged words, text-to-speech (BB-55, BB-57) |

The small "Learn about this" link on answer feedback (C2) and the Learn item in the main menu also lead here.

## I. Reading help

| ID  | Screen       | File                     | Route           | Needs                                                             |
| --- | ------------ | ------------------------ | --------------- | ----------------------------------------------------------------- |
| I1  | Reading help | `I1-ReadingHelp.dc.html` | `/account/help` | reading help settings, text-to-speech, i18n (BB-57, BB-58, BB-59) |
