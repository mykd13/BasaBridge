# Speech bake-off: how to transcribe a recording

Every recording gets a human transcript that says, word by word, what the reader actually said. These transcripts are the "truth" that every speech provider is scored against, so care here matters more than speed.

Work only inside the encrypted data folder (`BAKEOFF_DATA_DIR`). Never copy audio or transcripts anywhere else. See [PROTOCOL.md](PROTOCOL.md).

## 1. Start from the template

Run this once after new rows are added to `manifest.csv`:

```bash
pnpm --filter @basabridge/speech bakeoff:templates
```

It writes `transcripts/<recording_id>.tsv` for every recording that does not have one yet. Each file has one row per word of the passage, already marked `correct`. You only change the rows where something else happened. Existing files are never overwritten.

## 2. The columns

The file is tab-separated. Open it in a spreadsheet or a text editor.

| Column     | Meaning                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| `index`    | Position of the word in the passage, starting at 0. Empty for an inserted word.       |
| `expected` | The passage word. Empty for an inserted word.                                         |
| `outcome`  | What happened. One of the outcomes below.                                             |
| `said`     | What the reader actually said for this row, in lower case, words separated by spaces. |
| `start`    | Start time in seconds. Only for recordings chosen for timestamps.                     |
| `end`      | End time in seconds. Only for recordings chosen for timestamps.                       |

## 3. Outcomes

| Outcome           | When                                                            | What goes in `said`                                |
| ----------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `correct`         | The word was read correctly. An accent is not an error.         | The word                                           |
| `substitution`    | A different word, or a clearly wrong pronunciation, was said.   | What was said, spelled as heard: `bat`, `fis`      |
| `omission`        | The word was skipped.                                           | Nothing                                            |
| `insertion`       | An extra word that is not in the passage. Add a new row for it. | The extra word(s). Leave `index`, `expected` blank |
| `repetition`      | The word was read correctly more than once.                     | Every time it was said: `the the`                  |
| `self_correction` | The reader said something wrong, then fixed it.                 | The wrong try, then the right word: `bat cat`      |
| `unclear`         | You cannot tell what was said, even after three listens.        | Your best guess, or nothing                        |

Rules:

- **Accent is not an error.** If a listener from the Philippines would accept the word as the right word, it is `correct`. "Pish" for "fish" is `correct` if it is clearly the word "fish" in a Filipino accent, and `substitution` only if it sounds like a different word or not a word.
- **Dropped endings count.** "walk" for "walked" or "cat" for "cats" is a `substitution`, with what was said in `said`.
- **Sounding out is fine.** "c... ca... cat" ending on the right word is `correct` with `said` = `cat`. Do not write the partial sounds.
- **No fillers.** Do not write "um", "uh", coughs or long pauses.
- **Keep row order.** An inserted word goes between the rows where it was said.
- **Unclear words** are left out of every score, so use `unclear` rather than guessing a wrong outcome.

## 4. Timestamps (about 1 in 5 recordings)

James marks which recordings get timestamps. For those:

1. Open the WAV in Audacity and add a label track.
2. For every row that has something in `said`, select the span from the start of the first sound to the end of the last sound and add a label (Ctrl+B). Type anything as the label text, for example the word.
3. Export the labels (File, Export, Export Labels) to `labels/<recording_id>.txt` in the data folder.
4. Run:

   ```bash
   pnpm --filter @basabridge/speech bakeoff:labels rec-0042
   ```

   It copies the label times into the `start` and `end` columns, in order. It stops with an error if the number of labels does not match the number of rows with something in `said`.

## 5. Second opinions (about 1 in 10 recordings)

James picks some recordings for a second, independent transcript. Copy the template into `transcripts-second/<recording_id>.tsv` and transcribe without looking at the first one. The report shows how often the two annotators agreed, which tells us how far to trust the scores.
