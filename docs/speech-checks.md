# Speech environment and speaker checks (BB-70)

Code: `packages/speech/src/environment.ts`, `conditions.ts`, `authenticity.ts`, `checks.ts`.

## What they do

- **Before a try:** `assessRoom` reads loudness numbers from a short quiet moment and, if the learner says a test phrase, from that too. It returns `good`, `noisy`, `too_quiet` or `retry`, with fixed tip keys.
- **During a try:** `detectConditions` marks overlapping voices, long background speech and very low volume. Words touched by a condition get a confidence just under the low-confidence threshold. The alignment engine then flags them and never counts them as errors.
- **Playback:** `assessAuthenticity` sends a try for review when it has the same word timing as an earlier try, or when loudness and pacing are both unnaturally steady. It does not identify voices. `countsForLevelMovement` is false for a try that needs review until `confirmReview` is applied.

## Privacy

Every function takes numbers only: word timings, confidence and loudness per short frame. No audio goes in, comes out or is stored. The only thing kept from a try for comparison is its timing signature (start time of each word). Learner text is a set of i18n keys. The review key shows only that the try will be looked at and never says why.

## Thresholds

| Check                  | Value                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| Noisy room             | median background level 0.03 or more, or 90th percentile 0.08 or more           |
| Voice too quiet        | median voice level under 0.03; voice under 3 times the room counts as noisy     |
| Overlapping voices     | words overlap by over 0.15 s, in at least 3 pairs and 10% of words              |
| Background speech      | 2 s or more of loud frames (0.05) more than 0.2 s from any heard word           |
| Low volume             | word average under 0.015 for at least 30% of words                              |
| Same timing as earlier | 8 or more words, every start time within 0.03 s of an earlier try on this story |
| Steady level and pace  | level variation under 0.12 and word spacing variation under 0.1, 8+ words       |

Levels are RMS values from 0 to 1. The browser must compute them the same way for every device. The thresholds are starting values. They must be re-tuned on real recordings.

## Measured flag rates

Measured on seeded synthetic tries (`simulate.ts`), run in `checks.test.ts`.

| Case                                          | Result                  |
| --------------------------------------------- | ----------------------- |
| 20,000 clean tries, any condition flagged     | 0 flagged (0%)          |
| 20,000 clean tries, flagged for review        | 0 flagged (0%)          |
| 2,000 tries with overlapping voices added     | 99.95% detected         |
| 2,000 tries with background speech after read | 100% detected           |
| 2,000 quiet tries                             | 100% detected           |
| 2,000 replays of an earlier try's timing      | 100% flagged for review |
| 2,000 steady, machine-like tries              | 100% flagged for review |

Tests fail if clean tries are flagged for conditions in 1% or more, or for review in 0.5% or more.

## Limits

- The simulated tries are tidy, so these rates are better than real life will be. They show the logic works. They do not show the false flag rate on real children.
- Still to do by hand: run the checks on the BB-22 and BB-40 recordings, including noisy classrooms, Philippine-accented English and young children, then record the real rates and re-tune.
- Background speech that overlaps the learner's own words is caught only when the provider returns overlapping words. Quiet background talk during reading is not detected.
- There is no voice matching. "Clearly not the learner" is covered only by the timing and steadiness signs above.
