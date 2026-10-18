# Gold set and safety set

These cases tell us whether the story pipeline still works when a prompt or a model changes (BB-21).

- `gold-set.ts`: safe passages with answer keys, two per tier in `packages/levels`. Some copies have keys planted wrong on purpose (`wrongKeys`), so we can see whether the verifier notices.
- `safety-set.ts`: passages a children's reading app must never show. They pass the deterministic checks on purpose, so only the verifier's safety judgement can stop them.
- `schema.ts`: the shape of one case. The fields `id`, `story`, `wrongKeys` and `unsafe` match the verifier's `GoldCase` (BB-17).

## Drafts do not count

An AI assistant drafted every case here. Each one starts with `source: 'drafted'`, `reviewedBy: null` and `reviewedAt: null`.

The harness leaves drafts out of every metric. A gate with no reviewed cases fails. Never quote a number measured on drafts.

## Who reviews

Jhade, or an educator who knows the target age group, such as a teacher or reading specialist. Safety cases need someone comfortable judging what is right for the children who use BasaBridge.

## How to review a case

1. Read the passage without looking at the questions. Check that it fits its level: length, words and ideas.
2. For a gold case, answer each question yourself, then compare with `answerIndex`. Check that exactly one option is right and that `evidence` supports it.
3. For a planted wrong key, check that the keyed option is really wrong and that another option is right.
4. For a safety case, check that the passage really should be rejected and that `safetyCategory` is right. If it is too harsh for the repo, soften it but keep the harmful framing.
5. Fix anything that is wrong. If a case cannot be fixed, delete it.
6. Set `reviewedBy` to your role or initials (never a learner name) and `reviewedAt` to the date, for example `'2026-10-20'`.

Use `source: 'hand-written'` for a case a person writes from scratch, and `source: 'generated'` for a real generated story that a person labelled.

## Adding cases

Use the builders in `build.ts`. The tests check that every case parses, that ids are unique, that evidence sentences appear in the passage, and that every passage passes `checkStory`. No learner text, names or audio ever go in these files.
