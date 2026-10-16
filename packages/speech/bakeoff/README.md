# Speech provider bake-off (BB-22)

Throwaway scripts that compare speech providers on recordings of children reading in Philippine-accented English. Nothing here ships in the app, and nothing here is imported by `src`. The production adapter is BB-24 and the alignment engine is BB-25.

## Files

| File                                             | What it is                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| [PROTOCOL.md](PROTOCOL.md)                       | Consent, what we collect, where it is stored, deletion. DRAFT for Rhett. |
| [CONSENT.md](CONSENT.md)                         | Guardian form and child script. DRAFT for Rhett.                         |
| [ANNOTATION.md](ANNOTATION.md)                   | How to write the human transcripts.                                      |
| [passages.json](passages.json)                   | 12 passages, 4 per tier for levels 1 to 55.                              |
| [templates/manifest.csv](templates/manifest.csv) | The manifest columns, with one example row.                              |
| [vendors.json](vendors.json)                     | Price, retention and child-data terms per vendor, with the date checked. |
| `REPORT.md`                                      | Generated. Aggregated numbers only.                                      |
| `providers/`                                     | One adapter per vendor, each implementing `SpeechProvider`.              |

## Set up

1. Create the data folder on an encrypted drive, outside any repository, with `manifest.csv`, `audio/` and `transcripts/` (see `data.ts` for the layout).
2. Add to `.env.local` at the repo root (never commit it):

   ```bash
   BAKEOFF_DATA_DIR=/path/to/encrypted/bakeoff
   ```

   plus the keys for the providers you test (see the top of each file in `providers/`).

3. The harness refuses a data folder inside a repository. It also refuses a OneDrive, Dropbox or Google Drive path unless you set `BAKEOFF_ALLOW_SYNCED=1`, which you should only do for an encrypted container.

## Run

From the repo root:

```bash
pnpm --filter @basabridge/speech bakeoff selftest
```

Runs the whole pipeline offline on synthetic data in the OS temp folder. Nothing is sent anywhere.

```bash
pnpm --filter @basabridge/speech bakeoff check
```

Checks the manifest, audio and transcripts and prints counts.

```bash
pnpm --filter @basabridge/speech bakeoff run --provider deepgram,assemblyai --mode both --transport both
```

Sends each recording to each provider, with (`biased`) and without (`plain`) the passage text, by batch and by streaming where supported. Only recordings whose guardian ticked that vendor are sent. Results go to `results/` in the data folder. Finished calls are skipped on a rerun unless you add `--force`. Use `--limit 3` for a first try.

```bash
pnpm --filter @basabridge/speech bakeoff report
```

Writes `bakeoff/REPORT.md`.

Set `BAKEOFF_DEBUG=1` to print vendor error bodies while fixing an adapter. Leave it off for real runs.

## What is measured

- **Word error rate:** against what the reader actually said.
- **False error rate:** words the human marked as read correctly that the provider's output would mark wrong after aligning it to the passage. This is the number that hurts children most.
- **Missed error rate:** real misreadings the provider's output would accept. Biasing toward the passage pushes this up, which is why every provider runs with and without it.
- **Timestamp error:** start and end difference against human times, on the recordings that have them.
- **Confidence quality:** AUROC of confidence for telling wrong words from right ones, and the false and missed error rates when low-confidence words are flagged instead of counted.
- **Latency:** p50 and p95. For batch, request to final words. For streaming, last audio chunk to final words.
- **Built-in assessment:** for providers that mark miscues themselves, their flags against the human verdicts.

Intervals come from resampling readers, since one child's recordings are not independent.

## Privacy rules the code enforces

- The logger only accepts recording IDs, group fields, statuses, counts and timings.
- Vendor error bodies are dropped unless `BAKEOFF_DEBUG=1`.
- Only audio and passage text are sent to vendors. Reader fields never leave the data folder.
- The report hides any group with fewer than 5 recordings or 3 readers, and never prints reader codes.
