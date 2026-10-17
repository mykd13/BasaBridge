# Outcome measurement plan

Status: draft for review (BB-75). Owner: Sean. Nothing here is approved. Section 11 lists who must sign off before any learner is recruited.

This plan says how we would find out whether regular use of BasaBridge improves independent reading comprehension. It is a small, careful study. It is written to be honest about what a study this size can and cannot show.

## 1. Purpose and questions

**Main question.** Do learners in Grades 3 to 6 who use BasaBridge regularly for 8 to 10 weeks improve in independent reading comprehension, measured outside the app?

"Independent" means the child reads and answers without the app, without a teacher helping, and without any support from BasaBridge.

**Questions the study answers**

1. How much does reading comprehension change, on average, over the study?
2. What share of learners reach a meaningful change (defined in section 4)?
3. Is the change larger than the change in similar learners who have not started the app yet?
4. How much did learners actually use the app? Do results look different for learners who used it more? This last part is exploratory.

**What this plan is not**

- It is **not the validity study (BB-77).** BB-77 asks whether BasaBridge's own scores and levels agree with a standard reading assessment. Here the outside test is the yardstick. The app's levels and ability estimates are never used as the outcome. They appear only as context about use.
- It is **not the fairness study (BB-40).** BB-40 asks whether speech recognition works equally well across voices and accents. This plan does not test that.
- It is **not proof the app works.** It cannot be generalised to all Filipino learners. It must not be used to rank children, teachers or schools. It does not diagnose any child.

BB-77 depends on this plan. If BB-77 later reuses the same learners or the same outside scores, that is planned and approved on its own.

## 2. Participants

**Who and how many**

- Learners in Grades 3 to 6 at one or more partner schools.
- Target: about 30 learners per group who finish both tests. There are two groups (section 5), so about 60 in all.
- Plan to enrol more than 30 per group, because some learners will drop out. Enrolling about 36 per group allows for a loss of one in six. The final number is still open (section 11).

**The smallest effect this size can detect**

With 30 learners per group, a 5% significance level and 80% power, a comparison of mean change between two groups can reliably detect only a difference of about 0.7 standard deviations of change. That is a large effect. If a fifth of learners drop out, it rises to about 0.8.

The intervals will be wide too. The 95% interval around a difference in mean change will reach about half a standard deviation either side. For a share of learners near 30%, the interval is about 16 percentage points either side in one group, and about 23 points either side for the difference between groups.

So this is a **small-sample, exploratory study.** A real but modest gain could easily go unseen. A result that is not statistically clear is not evidence of no effect. A promising result is a reason to run a larger study, not a finding that the app works.

If whole classes are allocated to groups, 30 learners is only one or two classes. Learners in one class share a teacher and a routine, so the effective sample is smaller than the head count. Section 8 says how we report this.

**Included**

- Enrolled in Grade 3, 4, 5 or 6 at a partner school.
- A guardian has given study consent and the child has given assent (section 7).
- A guardian has also approved the microphone in the app (BB-8), so every learner gets the same read-aloud experience. This choice narrows who is in the study, and the report says so.
- Took the baseline Phil-IRI tests.
- Can use a device for the minimum dose, at school or at home.

**Excluded**

- Learners already at the independent level on the baseline graded passage. They have no room to move up.
- Learners without both consents, or whose consent has been withdrawn.
- Learners who miss the baseline tests and cannot be tested before the app starts.
- Children of the study team, so that no one has a personal stake in a child's result.

Learners who stop using the app, move school or miss the final test are not removed. They stay in the report as dropouts or missing data (section 9).

**Under-13s.** Every learner under 13 is enrolled only with a guardian's written study consent plus the child's own assent. Without both, the child can use BasaBridge as normal. They are simply not in the study, and none of their data is extracted. The ethics reviewer decides whether the same rule applies to learners aged 13 and over. The default is that it does.

## 3. Duration and dose

**Duration.** 8 to 10 weeks of use for each group, set with the school to fit its calendar. Both groups use the app for the same number of weeks. Avoid exam weeks and school breaks.

**Minimum dose.** At least 3 finished reading sessions per week, about 15 to 20 minutes each. A finished session is a `reading_sessions` row with `status` set to `done`. That is 24 to 30 sessions over the study. The number is a proposal. The reading specialist and the teachers confirm it before the plan is approved.

A learner is **at dose** if they reach the weekly minimum in at least three quarters of the weeks.

**How usage is checked**

- Each week the study coordinator receives weekly counts by study ID (section 6). Nothing in that report shows what a child read or said.
- If a learner is under 2 finished sessions in a week after the first two weeks, the coordinator tells the teacher using the school's own roster. The message is about the schedule. Children are not pressed or scolded.
- Where sessions happen, in class time or at home, is decided with the school and recorded. Time in class makes the dose more even between learners.

**Dose does not decide who is analysed.** The main analysis includes every enrolled learner, at dose or not. Results for learners who were at dose are shown next to it, and labelled exploratory.

## 4. Measure

**Instruments.** The Phil-IRI (Philippine Informal Reading Inventory), in English because BasaBridge stories are in English.

- **Group Screening Test.** Given to the whole class before and after. It gives a quick group view and helps spot learners at the top or bottom of the range at baseline.
- **Graded passages.** Read by each child with a teacher, who asks the comprehension questions afterwards. This is the main source of the outcome.

**Who gives them.** A teacher trained in Phil-IRI, outside the app, with BasaBridge closed and no accommodation. Where possible the tester is someone who does not know the child's group. If the class teacher gives the test, the report says so. A second trained scorer sits in on about one test in ten and scores separately. We report how often the two scorers agree. No audio is recorded for this.

**Who confirms the choice.** The reading specialist (BB-74) confirms that these instruments, the forms and the cut scores are right for Grades 3 to 6. Their changes are made in this document before baseline testing starts.

**Same passage level before and after.** A Phil-IRI level depends on the passage a child reads. Before and after, each learner reads parallel forms at the same grade level and matching difficulty. A move up must reflect the reader and not an easier passage. The specialist confirms which forms to use. Passages are never taken from BasaBridge stories, and BasaBridge never shows Phil-IRI passages.

**Outcome definitions, fixed before any data exist**

- **Comprehension score.** The percent of comprehension questions answered correctly on the graded passage.
- **Comprehension level.** Frustration, instructional or independent, using the cut scores in the current Phil-IRI manual, as confirmed by the specialist.
- **Meaningful change.** Moving up at least one comprehension level on the graded passage (frustration to instructional, or instructional to independent).

Why one level? It is a change a teacher would act on. But levels are coarse. A child can improve and stay in the same band, or cross a cut score on a small gain. That is why the plan also reports mean change in the comprehension score (section 8).

This definition is set now so that no one can choose a convenient one after seeing results. It changes only before baseline testing, only with the specialist's agreement, and only with an entry in the change log (section 9).

## 5. Comparison design

**Recommended: delayed start.** Learners are split into two groups with the same baseline test.

| When               | Group A (starts first)                  | Group B (delayed start)      |
| ------------------ | --------------------------------------- | ---------------------------- |
| Before week 1      | Baseline tests (T0)                     | Baseline tests (T0)          |
| Weeks 1 to 8 or 10 | Uses BasaBridge                         | Usual lessons, no BasaBridge |
| End of that period | Tests (T1)                              | Tests (T1)                   |
| Next 8 to 10 weeks | May keep using the app, use is recorded | Uses BasaBridge              |
| End of that period | Tests (T2), descriptive                 | Tests (T2)                   |

At T1, Group A has used the app and Group B has not. The difference in change between the groups is the main comparison. Group B then gets the app. Their change from T1 to T2 should look like Group A's change from T0 to T1. If it does, that is a replication. Every family is told at the start that the later group will get the same access.

The whole design takes up to 20 weeks, plus testing. Allocate by whole class where that is how the school works. If we can, choose which class goes first by a random draw, made by someone who does not teach them. If the school or teachers choose, the report says so.

**Fallback: before and after only.** If the school cannot hold back a group, everyone starts together and is tested before and after. This shows how much learners changed. It cannot show that the app caused the change, and the report must not say it did.

**Limits, in plain words**

- **Maturation.** Children get better at reading as the school year goes on. Before and after alone cannot separate this from the app. The delayed-start group is the only guard against it.
- **Teacher effect.** Learners in one class share a teacher. A teacher's skill, enthusiasm or scoring habits can move results. Allocating whole classes makes this impossible to separate from the app.
- **Practice effect.** Taking the same kind of test twice can raise scores on its own. Parallel forms reduce this and do not remove it.
- **No randomisation.** When whole classes are allocated, the groups may differ in ways we did not measure. We report the baseline difference.
- **Contamination.** A child in the waiting group may sign up and use the app. We ask families to wait. We cannot block them. We measure their use and report it.
- **Selection.** Learners with consenting guardians and a working device may differ from other learners.
- **Scoring error.** Phil-IRI is scored by people. The second-scorer check shows how large this is.
- **Regression to the mean.** Learners picked for a low baseline tend to score higher the second time with no help at all.
- **Conflict of interest.** The team that built the app runs the study. The report says so, and the plan is published before data are collected.

## 6. Usage events

These counts describe how the app was used. They are not the outcome. Every row uses a table that already exists in `packages/db/src/schema.ts`. No new tables, no new columns and no new personal fields are needed, with one exception to confirm (the withdrawal record in the first row).

| Event                                | Fields                                                                                                                                           | Purpose                                                                                                                                         | In the schema now?                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Study consent given or withdrawn     | `consents`: `kind` of `study`, `version`, `given_at`                                                                                             | Only learners with a current study consent are extracted. A withdrawal stops extraction.                                                        | Table exists. The `study` kind comes from BB-11. How a withdrawal is recorded is for Rhett to confirm (section 7). |
| Reading session started and finished | `reading_sessions`: `created_at`, `status`                                                                                                       | Dose: finished sessions per week                                                                                                                | Yes                                                                                                                |
| Tries in a session                   | `reading_sessions`: `tries_used`, `tries_allowed`. Count of `tries` rows and their `completed` flag.                                             | Effort: how many read-alouds a learner made and how many reached the end                                                                        | Yes                                                                                                                |
| Answers                              | `answers`: `correct`, `rushed`, `accommodations`. Weekly counts only, with one count per accommodation type.                                     | Quality of use. Share correct is context only. Rushed answers flag low-effort use. Accommodations show which supports were used (never hidden). | Yes                                                                                                                |
| Level changes                        | `decisions` rows where `kind` is `level`: `created_at`, and the from and to level in `evidence`. Also `learners.level` at the start and the end. | Context: how far the app moved each learner. It is not an outcome.                                                                              | Yes. Rhett confirms the shape of `evidence`.                                                                       |
| Lesson progress                      | `lesson_progress`: `lesson_id`, `completed_at`, `recheck_correct`, `recheck_total`                                                               | Use of Learn: lessons completed per week                                                                                                        | Yes                                                                                                                |
| Study register (outside the app)     | Study ID, class, group, grade, test dates, Phil-IRI results, withdrawal date                                                                     | Allocation and the outcome data                                                                                                                 | No. Kept in a separate register, never in the app database.                                                        |

**Rules applied to every row**

1. Only existing tables. Nothing new is added to the schema for this study.
2. The export uses a **pseudonymous study ID**: a random code with no link to a name, username, user ID, class or sign-up order. No names, usernames, emails, birth data or user IDs leave the app.
3. **Nothing from audio.** No `audio_objects`, no `tries.analysis`, no word-level differences. Words right and words per minute are also left out, because they come from the speech analysis. Only counts and flags are used.
4. No free text. `decisions.title` and `decisions.summary`, question text and chosen options are not exported.
5. Weekly counts, not event times. We do not export when a child was online.
6. Every read goes through the authorization layer (BB-10), as a read-only study export, and is written to `audit_log`. That study scope does not exist yet. It is work for Rhett.
7. Only learners with a current study consent are included. A withdrawal stops the export from that date.
8. Each row is checked against the BB-41 privacy rules, and **Rhett signs off** on every row before any data are collected. Until BB-41 is written, the check uses the golden rules in `AGENTS.md`. A row Rhett rejects is changed or removed here.

## 7. Study consent

**Separate from the app.** Study consent is its own choice. It is not part of sign-up, not part of the guardian's microphone approval (BB-8), and not a condition of using BasaBridge.

**What is recorded.** A `consents` row with `kind` set to `study` and the `version` of the text that was shown. BB-11 provides this. A guardian may not have an account, so the row sits against the learner's account. The child's assent also has to be recorded. Whether that is a second kind, such as `study_assent`, or part of the version is for BB-11 and Rhett to decide. This plan only needs both to exist and be checkable before a learner is enrolled.

**The texts**

- A parent or guardian version in English and in Filipino.
- A child assent version in English and in Filipino, in short, simple words, with spoken support. If it appears in the app, it goes through the i18n catalog with a simple and a standard wording.
- Both say what is measured (outside tests, and weekly usage counts), what is not (audio, names in the analysis), who sees the data, how long it is kept, how to withdraw, and that results are published whatever they show. Families in the delayed group are told they will start later and get the same access.

**Withdrawing.** A guardian or the child can withdraw at any time, for any reason, with no effect on how the child uses BasaBridge or on school. We then stop collecting and exporting. If the guardian asks, we delete the child's study data until the analysis data are locked. The school's own Phil-IRI records stay with the school under its rules. If a learner deletes their app account (BB-13), we treat it as a withdrawal.

**Approval.** No one is recruited until an ethics board, or a reviewer qualified in research with children, has approved the plan and every text. The school or its division office must also give permission. Rhett and counsel confirm the Philippine Data Privacy Act duties (BB-66). If a text changes, guardians are asked again.

## 8. Analysis

This is fixed before any data are seen.

**One primary outcome:** change in comprehension score from baseline to the end of the app period.

1. **Mean change with a 95% confidence interval**, for each group.
2. **The share of learners reaching a meaningful change** (section 4), with a 95% interval, for each group.
3. **The difference between groups at T1**, with a 95% interval. This is the difference in mean change, and the difference in shares. Group A is compared with Group B at the same time point.
4. **Replication.** Group B's change from T1 to T2 is shown beside Group A's change from T0 to T1. This is descriptive.
5. **Dose.** Results for learners at dose are shown beside the all-enrolled results, labelled exploratory. We do not claim a dose response.

**Rules for reading the results**

- We report intervals and sizes of change, not "significant" or "not significant".
- We do not run extra tests by grade, class or school. Class and grade are shown as plain breakdowns when there are enough learners, with small groups combined so no child can be picked out.
- Where whole classes are allocated, we show results by class. The head count overstates the sample, and we say so.
- Missing results are handled two ways: learners with both tests only, and learners with a missing final test counted as no change. Both are shown. If they disagree, we say so.
- The app's own levels and ability estimates are never used as outcomes.
- **No claims beyond what the data supports.** Before-and-after results say "changed". Only a comparison with the delayed group can say "changed more than". Nothing says "proved". Nothing says the app works for all learners.

## 9. Reporting

We publish the result whatever it shows. That includes no gain and a worse result.

The report includes:

- how many learners were invited, consented, were tested at each point, and were analysed, per group, with reasons for dropout where known;
- how much each group used the app, and how many were at dose;
- missing data and how it was handled (section 8);
- the baseline difference between groups, how groups were allocated, and who gave the tests;
- scorer agreement;
- every limit in section 5, and the conflict of interest;
- any difference between what was done and what this plan says, with the reason.

There are two versions. A full report for the team, the specialist, the ethics reviewer and the schools, in the repo under `docs/research/`. A short summary in plain English and Filipino for families. No statement about results goes on a screen or a website until it matches the report.

**Change log.** This plan is committed before baseline testing. Any change after that is dated here with the reason, and the report lists it.

| Date | Change   | Reason | Agreed by |
| ---- | -------- | ------ | --------- |
|      | None yet |        |           |

## 10. Data handling

- **The link.** One named person, the key holder, holds the table that links study ID to learner. It is kept in an access-restricted store, away from the app database and away from the analysis data. The analyst sees only study IDs. Proposed key holder: Rhett, because the link is tied to the app's user IDs.
- **The school.** Teachers record Phil-IRI results against the study ID. The school keeps its own roster and its normal records, under its own rules.
- **Analysis data.** A de-identified file: study ID, group, grade, test results, weekly counts. With small classes it is de-identified and not fully anonymous. So we publish only combined results and never publish school or class names, or any group small enough to point at a child.
- **Retention.** The ethics reviewer sets the final periods. Proposal: the analysis file is kept for 3 years after the final report for checking and follow-up, then deleted. The link table is deleted at the end of the study.
- **End of study.** The link table is deleted within 30 days after the last withdrawal window closes. Raw score sheets with study IDs follow the analysis file. The key holder confirms each deletion in writing, and the date goes in the sign-off table.
- **Access.** The key holder, the analyst and the study coordinator. Each has the minimum they need. No one has audio, because none is collected.
- **No new copies.** No data goes in email, chat, a shared drive or any model prompt. Golden rule 2 in `AGENTS.md` applies in full.

## 11. Approvals and sign-off

Nothing starts until every row below is signed. Roles without a named person are not yet filled.

| Role                                                                                                      | Person      | Date | Status |
| --------------------------------------------------------------------------------------------------------- | ----------- | ---- | ------ |
| Plan owner                                                                                                | Sean        |      | Draft  |
| Reading specialist (BB-74): confirms the instruments, the forms, the cut scores and the meaningful change | To be named |      | Open   |
| Platform and privacy: checks every usage event against BB-41 and builds the study export                  | Rhett       |      | Open   |
| Learning engine: confirms the usage counts match what the engine records, and that BB-77 stays separate   | Jhade       |      | Open   |
| Statistics reviewer: confirms the final sample size and the analysis                                      | To be named |      | Open   |
| Ethics board or reviewer qualified in research with children                                              | To be named |      | Open   |
| Data protection counsel (BB-66)                                                                           | To be named |      | Open   |
| School and division permission                                                                            | To be named |      | Open   |
| Key holder: confirms deletion at the end                                                                  | To be named |      | Open   |

**Still open**

- Choosing the instruments, forms and cut scores with the reading specialist.
- Ethics approval of the plan and the consent and assent texts.
- Rhett's privacy check of the usage events, and the study export scope in the authorization layer.
- The final sample size.
