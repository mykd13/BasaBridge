# 0003 Measuring comprehension, placement and Learn

Status: accepted. Date: 2026-10-17.

## Problem

The first plan measured comprehension with five multiple-choice questions per story and a simple percentage per skill. That has four weaknesses:

- A learner can guess one question in four.
- Each of three skills gets one or two questions per story, so the numbers are noisy.
- A wrong answer says nothing about why it was wrong, so we cannot teach the gap.
- Everyone starts at Level 1, so a stronger reader loses hours before the system finds them.

## Decisions

### 1. Measure ability, not percentages

- Every question has a sub-skill from a fixed list of nine (word in context, word parts, key detail, sequence, main idea, cause and effect, feelings, prediction, conclusion). Each rolls up to vocabulary, literal or inferential.
- Every wrong option has a distractor type (wrong detail, opposite, not stated, partly right, unrelated, word sense). A wrong answer therefore points at a likely misunderstanding.
- From Level 11 each story includes at least one question that is hard to guess: choose-all-that-apply or put-the-events-in-order.
- For each skill, and for comprehension overall, we keep a probability distribution over the learner's ability and update it after every answer. The update accounts for the chance of guessing right, so a lucky guess moves the estimate much less than a real answer. We report a best estimate and an uncertainty. Confidence labels come from the uncertainty.
- Answers given too fast to have involved reading, and answers after a supported try, count for less. Question read-aloud use is recorded on each answer and never hidden.
- Level movement uses the ability estimate: move up when the learner is very likely above this level (and has enough items, enough passed stories and solid words-right), move down when very likely below. The old rule of three passes is kept only as a fallback.
- Item difficulty starts from the story level and sub-skill, then is re-estimated from real answers. Items that are too easy, too hard or unrelated to ability are retired.
- A spoken retell scored against the story's key ideas is an experiment. It does not affect levels until a human-checked set shows it works.

All numbers live in `packages/levels` (`EVIDENCE_RULE`, `PLACEMENT_RULE`). The maths is in `packages/mastery`. Both are pure and tested.

### 2. Placement before the main course

- A new learner takes a short placement test before the main course unlocks. It uses two to four calibrated, human-reviewed stories (not live-generated), one try each, no Learn button and no extra help.
- The first story is chosen from the learner's grade. After each story the ability estimate updates and the next story is chosen at that level, moving at most 25 levels at a time. It stops when the estimate is certain enough or after four stories.
- The learner starts the main course a little below the estimate so the first stories feel doable.
- The result also recommends a reading-help preset (ADR 0004).
- Under-13 learners without guardian approval do a silent placement. It is flagged, confidence is capped, and a short re-check runs once voice is approved.
- A learner can retake placement after 30 days.

### 3. Learn

- A Learn button appears after a wrong answer (a small link, once per quiz) and on a result that did not pass or had misses. The home screen also has a Learn tab with lessons recommended from the learner's gaps.
- A lesson has a fixed shape: goal, short explanation with a tiny example, guided practice with hints, and a check with fresh questions. Lessons exist per sub-skill and per band of levels (1 to 30, 31 to 70, 71 to 100), plus word practice ("Say it") for words the reading analysis flagged, and decoding lessons.
- Explanations are written and reviewed by people. Practice and check items are generated and verified like stories.
- Practice inside Learn never changes the level. A lesson counts as learned only after the learner does well on fresh questions on that skill in their next real story.
- Learners never chat freely with a model.

## Consequences

- The mastery package and the contracts change. The seed simple estimates stay as a fallback until BB-19 replaces them.
- Stories need richer tagging, so the generation prompt, the checks and the verifier all change (BB-15, BB-16, BB-17, BB-43).
- A placement story bank needs educator-reviewed stories at steps of five levels (BB-48).
- Lesson content needs a reading specialist (BB-53, BB-74).
- Calibration needs real answers, so BB-45 runs after the first learner testing (M6).
- The ability maths and rules are placeholders until real learners and an outside measure check them (BB-77).
