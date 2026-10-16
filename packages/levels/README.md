# @basabridge/levels

## What this package owns

This package owns the tier table, the tries per story, the pass rule and the starting level. The UI, the prompts and the other packages import these numbers from here. They never copy them (AGENTS.md, golden rule 6).

All numbers live in `src/tiers.ts`. The functions that use them live in `src/index.ts`.

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

Stories have 5 to 15 words and stay at or below reading grade 2. They use everyday words in short sentences of 5 to 8 words. The story generator must hit that word range and grade cap, and `story-ai` checks both. The learner can try a story as many times as they like.

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

## Pass rule and level movement

- A story passes when the learner reads at least 85% of the words right on the counted try and answers at least 3 questions right.
- The 3 correct answers is a count, not a share. It holds whatever the question total, so a story cut to 4 questions still needs 3 right. This is kept on purpose until the educator review.
- 3 passed stories at one level move the learner up one level.
- A result is very weak when 40% or fewer of the questions are right. A very weak result moves the learner down one level. The movement itself lives in `packages/mastery` (`moveLevel`).
- New learners start at level 1.

## How to tune

1. Edit `src/tiers.ts` only.
2. Update the tier table above so it matches.
3. Run `pnpm --filter @basabridge/levels test`.

The property tests reject a change that breaks the ordering: gaps or overlaps between tiers, tries that go up, stories that get shorter, or a reading grade that falls. A test also checks that the tier table in this file matches `TIERS`.

## To review with an educator

- [ ] The 6 tier boundaries: levels 10, 30, 55, 75 and 90 end a tier
- [ ] Story length in words for each tier
- [ ] Max reading grade for each tier
- [ ] Tries per story for each tier
- [ ] 85% of words right to pass
- [ ] 3 of 5 questions right to pass
- [ ] 3 passes to move up a level
- [ ] 40% of questions right or less is very weak
