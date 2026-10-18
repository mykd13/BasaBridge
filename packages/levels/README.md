# @basabridge/levels

## What this package owns

This package owns every number that decides levels, tries and movement:

- the tier table and tries per story (`src/tiers.ts`)
- the pass rule (`src/tiers.ts`)
- the evidence rules for the ability model and the placement test rules (`src/evidence.ts`, ADR 0003)
- the listen-then-read rules (`src/listen.ts`, ADR 0004)

The UI, the prompts and the other packages import these numbers from here. They never copy them (AGENTS.md, golden rule 6). The data files hold numbers only. All rule data is frozen, so nothing can change it at run time.

## Tiers

There are 100 levels in six tiers. Higher tiers have longer stories, harder reading and fewer tries.

| Levels    | Story length (words) | Max reading grade | Tries per story | Stories are like                          |
| --------- | -------------------- | ----------------- | --------------- | ----------------------------------------- |
| 1 to 10   | 5 to 15              | 2                 | unlimited       | Everyday words, 5 to 8 words per sentence |
| 11 to 30  | 25 to 50             | 3.5               | 5               | A few new words explained by context      |
| 31 to 55  | 50 to 90             | 5                 | 4               | Joined sentences, some topic words        |
| 56 to 75  | 90 to 140            | 6.5               | 3               | Varied sentences, several topic words     |
| 76 to 90  | 140 to 200           | 8                 | 2               | Long sentences, subject words             |
| 91 to 100 | 200 to 260           | 10                | 1               | Advanced words, figurative language       |

### Levels 1 to 10

Stories have 5 to 15 words and stay at or below reading grade 2. They use everyday words in short sentences of 5 to 8 words. The story generator must hit that word range and grade cap, and `story-ai` checks both. The learner can try a story as many times as they like. Listen-then-read is offered only in this tier.

### Levels 11 to 30

Stories have 25 to 50 words and stay at or below reading grade 3.5. A few new words appear, and the sentence around each one explains it. `story-ai` checks the word range and grade cap. The learner gets 5 tries per story.

### Levels 31 to 55

Stories have 50 to 90 words and stay at or below reading grade 5. Sentences join together, and some topic words appear. `story-ai` checks the word range and grade cap. The learner gets 4 tries per story.

### Levels 56 to 75

Stories have 90 to 140 words and stay at or below reading grade 6.5. Sentences vary in length, and several topic words appear. `story-ai` checks the word range and grade cap. The learner gets 3 tries per story.

### Levels 76 to 90

Stories have 140 to 200 words and stay at or below reading grade 8. Sentences are long, and subject words appear. `story-ai` checks the word range and grade cap. The learner gets 2 tries per story.

### Levels 91 to 100

Stories have 200 to 260 words and stay at or below reading grade 10. Words are advanced, and the text uses figurative language. `story-ai` checks the word range and grade cap. The learner gets 1 try per story.

## Pass rule

- A story passes when the learner reads at least 85% of the words right on the counted try and answers at least 3 questions right.
- The 3 correct answers is a count, not a share. It holds whatever the question total, so a story cut to 4 questions still needs 3 right. This is kept on purpose until the specialist review.
- A pass decides the message the learner sees and whether Learn is offered (docs/PLAN.md section 6).
- A result is very weak when 40% or fewer of the questions are right.

## Level movement

Level movement uses the evidence rules below, not the pass count alone (docs/PLAN.md section 6.1). `packages/mastery` applies them in `levelReadiness`.

- **Up:** the ability model is at least 85% sure the learner is above the level, with at least 10 answers and 2 passed stories at the level, and the last two counted tries had at least 85% of words right.
- **Down:** the ability model is at least 85% sure the learner is below the level, with at least 8 answers.
- Otherwise the learner stays.

`packages/mastery` also still has the first simple rule, `moveLevel`: 3 passes move up one level and a very weak result moves down one. It reads `PASS_RULE.passesToLevelUp` and `PASS_RULE.veryWeakShare`. Which rule wins is decided in BB-19.

## Evidence rules

The ability model keeps a probability over each learner's ability and updates it after every answer (ADR 0003).

- **Guess rates.** The chance of a right answer from guessing alone. They fall as question types get harder to guess: multiple choice, then choose all, then order the events. A lucky guess moves the estimate far less than a real answer.
- **Discrimination.** How sharply one question separates stronger readers from weaker ones.
- **Weights.** A rushed answer and an answer after a supported try count for less than a normal answer, which counts 1. The item gates for moving up and down add up these weights over answers from stories at or above the level, so rushed answers cannot fill them.
- **Fading.** After each finished story, every stored estimate is tempered by `storyDecay`. This keeps old answers from outweighing recent growth, like the 0.85 decay in the simple model.
- **Focus switch margin.** The focus skill changes only when another skill is lower by more than `focus.switchMargin`.
- **Rushed answers.** An answer is rushed when it comes faster than a base time plus an allowance for each word on screen.
- **Sub-skill offsets.** Each sub-skill starts a little easier or harder than the story level. Real answers recalibrate them later (BB-45).

## Placement rules

A new learner takes a placement test before the main course (docs/PLAN.md section 6.2).

- The test uses at least 2 and at most 4 stories. It stops early once the ability estimate is certain enough.
- The first story starts from the learner's grade. A learner with no grade, or a grade not in the table, starts at the default level.
- Each next story moves at most 25 levels from the last one.
- The learner starts a little below the estimate, so the first stories feel doable.
- Placement tries with less than 85% of words right on average flag low decoding.
- A learner can retake placement after 30 days.

## Listen-then-read

The learner can hear the story read slowly with the words highlighted, then read it (ADR 0004). It is offered at level 10 and below, never in placement. A try after listening counts as supported.

## Rule values

Every number in the rules, in one place. A test checks that this table matches the data in `src/`, row for row.

| Rule                                           | Value | Meaning                                                     |
| ---------------------------------------------- | ----- | ----------------------------------------------------------- |
| `PASS_RULE.minWordsRight`                      | 0.85  | Share of words right on the counted try to pass             |
| `PASS_RULE.minQuestionsCorrect`                | 3     | Questions right to pass, as a count                         |
| `PASS_RULE.passesToLevelUp`                    | 3     | Passes to move up, in the simple rule                       |
| `PASS_RULE.veryWeakShare`                      | 0.4   | Share of questions right at or below which a result is weak |
| `EVIDENCE_RULE.guess.multiple_choice`          | 0.25  | Guess rate for a multiple choice question                   |
| `EVIDENCE_RULE.guess.choose_all`               | 0.1   | Guess rate for a choose-all question                        |
| `EVIDENCE_RULE.guess.order_events`             | 1/24  | Guess rate for an order-the-events question                 |
| `EVIDENCE_RULE.discrimination`                 | 1.5   | How sharply a question separates readers                    |
| `EVIDENCE_RULE.weight.rushed`                  | 0.3   | Weight of a rushed answer                                   |
| `EVIDENCE_RULE.weight.supportedTry`            | 0.7   | Weight of an answer after a supported try                   |
| `EVIDENCE_RULE.storyDecay`                     | 0.9   | Power that fades stored estimates after each finished story |
| `EVIDENCE_RULE.up.probability`                 | 0.85  | Certainty needed to move up                                 |
| `EVIDENCE_RULE.up.margin`                      | 0.25  | How far above the level ability must be to move up          |
| `EVIDENCE_RULE.up.minItems`                    | 10    | Weighted answers at or above the level needed to move up    |
| `EVIDENCE_RULE.up.minPasses`                   | 2     | Passed stories at the level needed to move up               |
| `EVIDENCE_RULE.up.minWordsRight`               | 0.85  | Words right on the last two counted tries to move up        |
| `EVIDENCE_RULE.up.recentTries`                 | 2     | Counted tries that must read well, this story's included    |
| `EVIDENCE_RULE.down.probability`               | 0.85  | Certainty needed to move down                               |
| `EVIDENCE_RULE.down.margin`                    | 0.5   | How far below the level ability must be to move down        |
| `EVIDENCE_RULE.down.minItems`                  | 8     | Weighted answers at or above the level needed to move down  |
| `EVIDENCE_RULE.focus.switchMargin`             | 0.2   | How much lower another skill must be to change the focus    |
| `EVIDENCE_RULE.rushed.baseMs`                  | 1200  | Base time in ms under which an answer is rushed             |
| `EVIDENCE_RULE.rushed.perWordMs`               | 35    | Extra ms allowed for each word on screen                    |
| `EVIDENCE_RULE.subskillOffset.word_in_context` | 0     | Difficulty offset for word in context                       |
| `EVIDENCE_RULE.subskillOffset.word_parts`      | 0.2   | Difficulty offset for word parts                            |
| `EVIDENCE_RULE.subskillOffset.key_detail`      | -0.3  | Difficulty offset for key detail                            |
| `EVIDENCE_RULE.subskillOffset.sequence`        | -0.1  | Difficulty offset for sequence                              |
| `EVIDENCE_RULE.subskillOffset.main_idea`       | 0.1   | Difficulty offset for main idea                             |
| `EVIDENCE_RULE.subskillOffset.cause_effect`    | 0.3   | Difficulty offset for cause and effect                      |
| `EVIDENCE_RULE.subskillOffset.feelings`        | 0.2   | Difficulty offset for feelings                              |
| `EVIDENCE_RULE.subskillOffset.prediction`      | 0.4   | Difficulty offset for prediction                            |
| `EVIDENCE_RULE.subskillOffset.conclusion`      | 0.5   | Difficulty offset for conclusion                            |
| `PLACEMENT_RULE.minStories`                    | 2     | Fewest placement stories                                    |
| `PLACEMENT_RULE.maxStories`                    | 4     | Most placement stories                                      |
| `PLACEMENT_RULE.stopSd`                        | 0.45  | Uncertainty at or below which placement stops               |
| `PLACEMENT_RULE.maxStep`                       | 25    | Most levels between one placement story and the next        |
| `PLACEMENT_RULE.conservative`                  | 0.5   | Deviations below the estimate to start the course           |
| `PLACEMENT_RULE.lowDecoding`                   | 0.85  | Words right share below which placement flags low decoding  |
| `PLACEMENT_RULE.retakeAfterDays`               | 30    | Days before placement can be retaken                        |
| `PLACEMENT_RULE.gradeStart.1`                  | 10    | First placement level for grade 1                           |
| `PLACEMENT_RULE.gradeStart.2`                  | 20    | First placement level for grade 2                           |
| `PLACEMENT_RULE.gradeStart.3`                  | 30    | First placement level for grade 3                           |
| `PLACEMENT_RULE.gradeStart.4`                  | 42    | First placement level for grade 4                           |
| `PLACEMENT_RULE.gradeStart.5`                  | 55    | First placement level for grade 5                           |
| `PLACEMENT_RULE.gradeStart.6`                  | 68    | First placement level for grade 6                           |
| `PLACEMENT_RULE.defaultStart`                  | 25    | First placement level with no known grade                   |
| `LISTEN_THEN_READ.maxLevel`                    | 10    | Highest level where listen-then-read is offered             |
| `LISTEN_THEN_READ.pace`                        | 0.7   | Model voice speed, where 1 is normal                        |

## How to tune

1. Edit the data file only: `src/tiers.ts`, `src/evidence.ts` or `src/listen.ts`.
2. Update the matching table in this file.
3. Run `pnpm --filter @basabridge/levels test`.

The property tests reject a change that breaks the ordering or the ranges:

- gaps or overlaps between tiers, tries that go up, stories that get shorter, or a reading grade that falls
- guess rates that do not fall as question types get harder, or thresholds and weights that are not probabilities
- grade starts that do not rise with grade, or start levels outside 1 to 100

The README tests check that both tables in this file match the data.

## To review with the reading specialist

These are placeholders until the reading specialist reviews them (BB-74).

- [ ] The 6 tier boundaries: levels 10, 30, 55, 75 and 90 end a tier
- [ ] Story length in words for each tier
- [ ] Max reading grade for each tier
- [ ] Tries per story for each tier
- [ ] 85% of words right to pass
- [ ] 3 questions right to pass, and whether that should be a share instead of a count
- [ ] 3 passes to move up a level in the simple rule
- [ ] 40% of questions right or less is very weak
- [ ] Guess rates by question type
- [ ] Discrimination
- [ ] Rushed and supported-try weights
- [ ] Move-up and move-down thresholds: certainty, margin, answers, passes, words right
- [ ] Sub-skill difficulty offsets
- [ ] Rushed-answer timing: base time and per-word allowance
- [ ] Placement: stories per test, stop certainty, step limit, start level per grade, default start, how far below the estimate to start, low-decoding share, retake period
- [ ] Listen-then-read: highest level and voice speed
