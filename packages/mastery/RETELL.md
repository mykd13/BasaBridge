# Spoken retell scoring experiment (BB-46)

After the questions, a learner may tell the story back in their own words. A retell is hard to guess and shows whether the learner understood the story. This is an experiment. Retell scores are shown to nobody and change no level.

Plan: docs/PLAN.md section 6.1. Decision: ADR 0003.

## How a retell is scored

1. When a story is generated, it lists 3 to 6 key ideas (`checkKeyIdeas` in `packages/story-ai`). Each idea is a short sentence for the human checker plus cue groups. A cue group is a set of single words where any one counts, for example `["fall", "fell", "drop"]`. Every group must have at least one word that appears in the passage.
2. The speech pipeline turns the retell into words.
3. `scoreRetell` in this package marks an idea as covered when every one of its cue groups has a word in the retell. Words are compared after a rough stem, so "mangoes" matches "mango" and "falling" matches "fall".
4. The score is the number of ideas covered out of the total.

No model judges the child. The scoring is word matching in code, so the same retell always gets the same score.

Known limits:

- Negation is ignored. "The mangoes did not fall" covers an idea about mangoes falling.
- Word order is ignored.
- Irregular forms (ran and run, fell and fall) only match when the cue group lists both.

The agreement check below exists to find out whether these limits matter in practice.

## Checking it against people

A person reads each retell transcript and marks each key idea as covered or not, without seeing the code's score. The scoring code marks the same ideas. `retellAgreement` compares them:

- **Cohen's kappa** over all ideas. This is agreement corrected for chance, so a scorer that says "covered" every time does not look good.
- **Totals within one:** the share of retells where the code's count of covered ideas is within one of the person's count.
- **Code only** and **human only** counts, to see which way the scorer errs.

To build the human-checked set:

- Use retells from M6 learner testing only, from learners whose guardians agreed to the study.
- A second person checks a fifth of the retells as well, so we know how much people agree with each other. If people agree with each other less than the gate below, lower expectations or improve the key ideas before blaming the scorer.
- Write the set as JSON in this shape and keep it on the checker's machine. It holds transcripts, so it is never committed and never sent to a model.

```json
{
  "retells": [
    {
      "storyId": "story uuid",
      "keyIdeas": [{ "cues": [["mango", "mangoes"], ["tree"]] }],
      "transcript": "there was a mango tree",
      "human": [true]
    }
  ]
}
```

Then run:

```bash
pnpm --filter @basabridge/mastery retell:agreement path/to/set.json
```

The script prints counts only, never transcript text. Record the printed report in a comment on BB-46 with the date.

## The threshold

`RETELL_GATE` holds the bar. All of these must hold:

| Measure                | Bar          | Why                                                                                                                                     |
| ---------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Cohen's kappa          | at least 0.7 | Commonly read as substantial agreement. Below this, too many ideas would be scored differently from a person to trust it for one child. |
| Totals within one idea | at least 90% | A level decision cares about the whole retell. Being off by more than one idea in 1 retell in 10 is too often.                          |
| Retells in the set     | at least 60  | Fewer gives a kappa too uncertain to act on.                                                                                            |
| Different stories      | at least 10  | Key ideas vary by story. A scorer that works on a few stories may not work on others.                                                   |

Clearing the bar does not switch anything on. `RETELL_GATE.usableForLevels` stays `false`. Using retell scores for levels needs a new decision that says how a retell counts, and that rule then lives in `packages/levels` like every other level rule (AGENTS.md rules 1 and 6). Until then no level code reads a retell score.

## Privacy

- No names, usernames or audio go into scoring. `scoreRetell` takes transcript words and key ideas only.
- No audio is kept. Retell audio follows the same rule as a reading try: discarded after transcription unless the learner turned retention on.
- The transcript is deleted after scoring unless retention is on. Only the per-idea result is kept, and it is shown to nobody.

## Not built yet

This package holds the scoring, the agreement check and the gate. These parts need owners outside it:

- `packages/contracts`: an optional `keyIdeas` field on `Story` (Rhett).
- `packages/db`: key ideas stored with the story, and a retell result table with no transcript column unless retention is on (Rhett).
- `packages/speech`: agreement to send retell audio to the speech provider, reusing `SpeechProvider.transcribe` with the story as reference text (James and Jhade).
- `apps/web`: an optional retell step after the questions and a server route that transcribes, scores, stores the result and discards the audio and transcript (Sean).
