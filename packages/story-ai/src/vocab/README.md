# Vocabulary list

The vocabulary check measures how many words in a story a Filipino learner at that tier is likely to know. It uses the New General Service List (NGSL) 1.2: the 2,809 most useful English words for second-language learners, ranked by frequency, with every inflected form.

## Why NGSL

- It is built for learners of English as a second language, which is how most Filipino children meet English in school.
- It is ranked by frequency, so each tier can allow the first N words.
- The research version lists every inflected form (go, goes, went, gone, going), so the check needs no stemmer.
- It has an open licence.

NGSL counts how often adults use words, so it ranks many words that young children learn first (red, kite, tree, sister, beach) low or leaves them out. `child-words.ts` lists about 250 of these concrete early words, and the check counts them as known at every tier. Keep that list short and concrete.

Common Filipino words that appear in English stories (Lola, adobo, jeepney, barangay) are not in NGSL. They are in `LOCAL_WORDS` in `src/guidelines.ts`, and the check counts them as known at every tier. Names of people and places are skipped.

## Files

| File                                       | What it is                                                   |
| ------------------------------------------ | ------------------------------------------------------------ |
| `data/NGSL_12_stats.csv`                   | Each word with its frequency rank.                           |
| `data/NGSL_12_lemmatized_for_research.csv` | Each word with all its forms.                                |
| `data/SUP_lemmatized.csv`                  | Days, months and number words. Allowed at every tier.        |
| `word-list.json`                           | Built from the three files above. The code reads only this.  |
| `word-list.ts`                             | Looks up the rank of a word form.                            |
| `child-words.ts`                           | Early concrete words known at every tier.                    |
| `profile.ts`                               | Counts known and new words in a passage.                     |
| `idioms.ts`                                | Idioms that are not allowed below the tiers that allow them. |

The CSV files were downloaded from newgeneralservicelist.com on 2026-10-18. The only changes are line endings (CRLF to LF) and a removed byte order mark.

To rebuild `word-list.json` after replacing the CSV files:

```bash
pnpm --filter @basabridge/story-ai word-list
```

## Licence and attribution

The NGSL is by Charles Browne, Brent Culligan and Joseph Phillips, and is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-sa/4.0/). The files in `data/` and the derived `word-list.json` are shared under the same licence. Source: https://www.newgeneralservicelist.com/new-general-service-list

## Limits for each tier

The allowed rank, the share of known words and the number of new words for each tier are in `packages/levels` (`vocabulary` on each tier), next to the reading-grade cap. Change them there, with the comparison report from `src/validation` in the pull request.
