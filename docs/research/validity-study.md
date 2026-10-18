# Validity study plan

Status: draft for review (BB-77). Owner: Jhade. Nothing here is approved. Section 11 lists who must sign off before any learner takes part.

This plan says how we check whether BasaBridge's own numbers agree with an outside reading assessment. The numbers are the ability estimate, the placement level, words right and words per minute. Until this check is done, every level and score in the app is an estimate (docs/PLAN.md section 13).

## 1. Purpose and questions

**Main question.** Do BasaBridge's levels and scores put learners in the same order, and in the same reading band, as a standard reading assessment given outside the app?

**Questions the study answers**

1. How closely does the ability estimate follow the outside comprehension score?
2. How often does the placement level put a learner in the same reading band as the outside test? How far off is it when it misses?
3. How large are the errors in words right and words per minute, compared with the outside word reading and reading rate?
4. Where the app disagrees strongly, why? What do we change: the ability model, the level table or the question tags?

**What this plan is not**

- It is **not the outcome study (BB-75).** That study asks whether the app helps learners improve, with the outside test as the yardstick and the app's numbers never used as the outcome. This study asks whether the app's numbers are right. Its outcome is the agreement itself.
- It is **not the fairness study (BB-40).** That study checks whether speech recognition works equally well across voices. If our words right is wrong for some voices, this study may see it, but it is not designed to measure it.
- It does **not grade or diagnose any child.** Results are reported as group agreement. A single learner's result is looked at only to find the cause of a disagreement, by study ID.

## 2. Participants

**Who.** Learners in Grades 3 to 6 at one or more partner schools, with study consent (section 7).

**How many.** Target about 50 learners who finish both the outside test and the app sessions. Enrol about 60 to allow for dropout. Spread them across grades so that every tier from Level 11 to Level 75 has some learners.

**What that size can show.** With 50 learners, a rank correlation of 0.6 has a 95% interval of about 0.39 to 0.75. With 30 it is about 0.31 to 0.79. That is enough to tell a useful measure from a weak one. It is not enough to tune many numbers at once, or to report reliably by grade or tier. Section 6 limits which numbers the data may change.

**Reusing BB-75 learners.** If the outcome study runs at the same schools, its baseline Phil-IRI results could serve here. That saves children a second test. It needs its own approval, because the BB-75 consent does not cover comparing the app's speech scores with the outside test, and the BB-75 export leaves words right and words per minute out on purpose. Until that is approved, the two studies use separate consents and separate data.

**Included**

- Grade 3, 4, 5 or 6 at a partner school.
- Study consent from a guardian and assent from the child.
- A guardian has approved the microphone (BB-8). Learners without it can take part in the comprehension comparisons only (section 4).

**Excluded**

- Learners who already used BasaBridge for more than two weeks before the study. Their level reflects practice in the app, not a fresh placement.
- Children of the study team.

## 3. Procedure

Each learner does two things, no more than 14 days apart, with no BasaBridge use in between except the study sessions.

1. **The outside test.** The Phil-IRI in English, chosen in BB-75 and confirmed by the reading specialist (BB-74). It includes the Group Screening Test and graded passages read with a trained teacher, with BasaBridge closed. The tester records word reading, reading time where the manual asks for it, and comprehension. A second trained scorer scores about one test in ten separately.
2. **The app sessions.** The learner takes placement, then reads at least 3 stories at the level it gives. Normal app rules apply: tries, accommodations and Learn work as for any learner. The sessions are supervised, so there is no help beyond what the app records.

Half the learners in each class take the outside test first and half take the app sessions first, chosen by a draw. This spreads practice and tiredness effects evenly.

The tester does not see the app's results, and the app never sees the outside results. They meet only in the analysis file, by study ID.

## 4. What is compared

Every comparison is fixed here before any data exist.

| App value                                                                            | Outside value                                                                 | Same scale? | Reported                                                                  |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Comprehension ability estimate after placement and the study stories (best estimate) | Comprehension score on the graded passage, percent                            | No          | Rank correlation with a 95% interval                                      |
| Placement level                                                                      | Phil-IRI reading level: the highest grade passage read at instructional level | No          | Rank correlation with a 95% interval                                      |
| Placement level, put into a grade band with the band map (section 5)                 | Phil-IRI reading level as a grade band                                        | Yes, bands  | Quadratic weighted kappa, exact agreement, confusion table, strong misses |
| Words right on counted tries, mean share across placement and study stories          | Word reading score on the graded passage, percent                             | Yes         | Bias, mean absolute error, limits of agreement, rank correlation          |
| Words per minute on counted tries, median across stories                             | Reading rate on the graded passage, where timed                               | Yes         | Bias, mean absolute error, limits of agreement, rank correlation          |

**Notes**

- The app and the outside test use different passages. Some bias in words right and words per minute is expected, so the rank correlation matters as much as the size of the errors.
- Learners with a silent placement (no microphone) count only in the first three rows. Their words right and words per minute do not exist.
- Tries marked as supported (listen-then-read) and answers marked as rushed are counted and reported. The main analysis uses the app's numbers as they are, adjustments included, because those are what decide levels. A second analysis without supported tries is shown beside it.
- The band map, the Phil-IRI cut scores and which grade passages each learner reads come from the reading specialist. They are fixed before testing starts.

**Thresholds, proposed before any data**

These are the lines the report uses to call agreement good, weak or poor. They are proposals until the statistics reviewer agrees.

| Measure                                             | Good         | Weak       | Poor          |
| --------------------------------------------------- | ------------ | ---------- | ------------- |
| Rank correlation                                    | 0.6 or more  | 0.4 to 0.6 | under 0.4     |
| Quadratic weighted kappa (bands)                    | 0.6 or more  | 0.4 to 0.6 | under 0.4     |
| Learners with a strong miss (2 or more bands apart) | 10% or fewer | 10% to 20% | more than 20% |

Every result is reported with its interval. If the interval crosses a line, the report says so and does not pick the better side.

## 5. Analysis

The statistics are in `packages/mastery/src/validity.ts`, with tests that check them against published and hand-worked values. They are pure functions. The app never calls them.

| Step                                             | Function                                       |
| ------------------------------------------------ | ---------------------------------------------- |
| Rank correlation                                 | `spearman`                                     |
| 95% interval for any statistic, seeded bootstrap | `bootstrapInterval`                            |
| Bias, mean absolute error, limits of agreement   | `errorSummary`                                 |
| Put a value into a band with cut points          | `toBand`                                       |
| Confusion table, exact agreement, weighted kappa | `confusion`, `exactAgreement`, `weightedKappa` |
| List of strong misses, by study ID               | `strongDisagreements`                          |

**Band map.** The placement level is turned into a grade band with cut points that the specialist sets, based on the reading grade caps in the tier table. The cut points are written in the analysis notes, not in `packages/levels`, until the study shows they hold.

**Rules for reading the results**

- Report intervals and sizes, not "significant" or "not significant".
- Show grade breakdowns only where a grade has at least 8 learners. Combine smaller groups.
- Learners missing one side of a comparison are left out of that comparison only. The report gives the count for each row.
- The scorer agreement on the outside test is reported first. If two trained scorers often disagree, the outside test is noisy too, and agreement with the app cannot be higher than that.

## 6. Investigating disagreement and changing numbers

**Finding the cause.** For every learner in the strong-miss list, and for any pattern the analysis shows, check in this order:

1. **The data.** A tester note, a session that broke off, a silent placement, a speech failure, many rushed answers, heavy use of accommodations.
2. **The pattern.** Do the misses cluster by grade, by tier, by starting grade, by sub-skill or by question type? Is the app mostly too high, or mostly too low?
3. **The cause.** Tie each pattern to one part of the system: the ability model, the level table, or the question tags.

**What each cause can change**

| Cause                                                   | What changes                                                          | Where                             |
| ------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| Placement too high or too low for one grade             | `PLACEMENT_RULE.gradeStart`, `PLACEMENT_RULE.conservative`            | `packages/levels/src/evidence.ts` |
| Placement stops while still unsure                      | `PLACEMENT_RULE.stopSd`, `PLACEMENT_RULE.maxStories`                  | `packages/levels/src/evidence.ts` |
| Lucky guesses or rushing move the estimate too much     | `EVIDENCE_RULE.guess`, `EVIDENCE_RULE.weight`, `EVIDENCE_RULE.rushed` | `packages/levels/src/evidence.ts` |
| One sub-skill is always too hard or too easy            | `EVIDENCE_RULE.subskillOffset`, and item calibration (BB-45)          | `packages/levels/src/evidence.ts` |
| Questions tagged to the wrong sub-skill                 | The tags on those questions                                           | `packages/story-ai`               |
| Words right too high or too low against the teacher     | Alignment or pace in the speech pipeline, raised with James           | `packages/speech`                 |
| A tier's reading grade does not match the outside level | Tier boundaries or grade caps, with the specialist                    | `packages/levels/src/tiers.ts`    |

**Rules for changing a number**

- One change per pull request in `packages/levels`, with the data summary that supports it and the README table updated, as the README's "How to tune" says.
- A number changes only when the interval for its effect points one way. Five learners are not enough to move a grade start.
- Where possible, a change is checked on learners who were not used to choose it. With this sample size that usually means the next group of learners, and the report says so.
- Some numbers this study cannot test: story length per tier, tries per tier, and the pass rule's question count. They stay as they are until the specialist review (BB-74). The report lists them as not tested.
- The report says for each placeholder in the README review list whether it was supported, changed or not tested. This answers the last line of the BB-77 issue.

## 7. Consent and privacy

**Study consent.** Separate from using the app, as in BB-75 section 7. The texts say that the app's reading scores will be compared with a school reading test, and that the comparison uses scores only, never audio.

**What leaves the app.** For each consented learner, by study ID:

- the final comprehension ability estimate and its uncertainty
- the placement level, whether placement was silent, and how many placement stories were used
- per counted try: words right as a share and words per minute
- per answer: correct or not, sub-skill, question type, rushed, accommodations
- per try: whether it was supported

**What never leaves the app.** Names, usernames, user IDs, birth data, audio, word-level differences, transcripts, story text, answer text and timestamps.

**Why this needs its own approval.** Words right and words per minute come from speech analysis. BB-75 section 6 left them out of its export on purpose. This study needs them, so it needs:

- a study export scope in the authorization layer (BB-10), with every read written to `audit_log`. That is Rhett's work and a locked area.
- Rhett's check of every field above against the privacy rules (BB-41), before any data are collected.
- the ethics reviewer's approval of the consent and assent texts.

Audio retention does not change. Audio is still discarded after analysis unless the learner turned retention on (golden rule 3). The study never collects audio.

## 8. Reporting

The full report goes in `docs/research/` and is shared with the team, the reading specialist and the schools. A short summary in plain English and Filipino goes to families. We publish the result whatever it shows.

The report includes:

- how many learners consented, finished each part, and were analysed in each comparison
- scorer agreement on the outside test
- every row of section 4 with its interval and its threshold label
- the strong-miss list as counts by direction and pattern, never by child
- each change made to the model, the level table or the tags, with its reason
- for each placeholder in the `packages/levels` README review list: supported, changed or not tested
- the limits in section 9

## 9. Limits

- **Different passages.** The outside test and the app use different texts. Some disagreement is the passages, not the app.
- **Phil-IRI is scored by people.** It is a yardstick with its own error. Agreement cannot be better than the two scorers agree with each other.
- **Small sample.** About 50 learners can show whether agreement is useful. It cannot tune many numbers at once, or show agreement for each grade on its own.
- **Selection.** Learners with consent and an approved microphone may differ from other learners.
- **One language.** Stories and the outside test are both in English. Results say nothing about Filipino reading.
- **Changes on the same data.** A number chosen from this data will look better on this data than on new learners. Section 6 says how we limit that.
- **Conflict of interest.** The team that built the app runs the study. The report says so.

## 10. Data handling

As in BB-75 section 10: one key holder keeps the link between study ID and learner, apart from the app database and the analysis file. The analyst sees study IDs only. No data goes in email, chat, a shared drive or a model prompt. The ethics reviewer sets how long the analysis file is kept.

## 11. Approvals and sign-off

Nothing starts until every row below is signed.

| Role                                                                     | Person      | Date | Status |
| ------------------------------------------------------------------------ | ----------- | ---- | ------ |
| Plan owner, learning engine                                              | Jhade       |      | Draft  |
| Reading specialist (BB-74): instrument, forms, cut scores, band map      | To be named |      | Open   |
| Platform and privacy: export scope in BB-10, field check against BB-41   | Rhett       |      | Open   |
| Speech: how words right and words per minute are computed and compared   | James       |      | Open   |
| Product and BB-75 owner: whether the two studies share learners or tests | Sean        |      | Open   |
| Statistics reviewer: sample size, thresholds, analysis                   | To be named |      | Open   |
| Ethics board or reviewer qualified in research with children             | To be named |      | Open   |
| School and division permission                                           | To be named |      | Open   |

## 12. Change log

This plan is committed before any testing. Any change after that is dated here with the reason.

| Date | Change   | Reason | Agreed by |
| ---- | -------- | ------ | --------- |
|      | None yet |        |           |
