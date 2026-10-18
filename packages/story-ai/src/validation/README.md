# Reading-grade validation

The story checks cap the reading grade of each passage by tier. The cap comes from `maxReadingGrade` in `packages/levels`. The grade comes from `readingGrade` in `src/checks.ts`, a Flesch-Kincaid formula that is noisy on short texts. This folder checks that formula against people.

## Who rates

An educator who knows the target age group, such as a teacher or reading specialist. Aim for about 50 passages spread over all six tiers, so each tier has at least 5.

## How to rate

1. Take passages written for a known level. Use real generated stories or passages written by hand. Never use text from a learner.
2. Rate each passage without looking at the measured grade. Give the school grade a typical learner at that level could read on their own.
3. Add one entry per passage to `rated-sample.json`:

```json
{
  "id": "t2-001",
  "text": "The passage text.",
  "level": 20,
  "ratedGrade": 3,
  "rater": "teacher-a"
}
```

`rater` is a role or initials. Never put a learner name in this file.

## Run the report

```bash
pnpm --filter @basabridge/story-ai grade-report
```

It prints:

- the mean absolute error and the correlation between the measured and the rated grade;
- for each tier, how many rated passages the cap would reject although the rater says they fit (wrongly rejected), and how many it would accept although the rater says they are too hard (wrongly accepted).

## When to change a cap

- If the mean absolute error is over 1 grade, or the correlation is under 0.7, the measure is too noisy for the caps to mean much. Open an issue to change the measure.
- If a tier has wrongly rejected passages in more than 1 of 5 rated, the cap is too low for that tier. Raise `maxReadingGrade` for it.
- If a tier has wrongly accepted passages in more than 1 of 5 rated, the cap is too high. Lower it.

These limits are starting points. The decision belongs to Jhade. A cap change is its own commit in `packages/levels`, with the report pasted in the pull request.

`rated-sample.json` starts empty on purpose. Do not add made-up ratings. The tests use small samples written inside the test files and never read this file.
