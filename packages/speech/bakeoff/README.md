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
4. Before the first AssemblyAI run, turn on the model-training opt-out in the AssemblyAI dashboard. The API has no switch for it, so streaming refuses to start until you also set `ASSEMBLYAI_TRAINING_OPT_OUT=confirmed`.
5. Smoke-test every adapter with an adult team member's voice before any child's recording is sent. Use a separate data folder for this: record one passage as `rec-9001`, give it a manifest row with reader code `R99` (the age band value does not matter there), point `BAKEOFF_DATA_DIR` at it and run each provider with `--limit 1`. The Speechmatics batch path in particular was written from memory. The smoke-test folder never feeds the report.

The scripts run through `tsx`, because Node's built-in TypeScript cannot load the workspace packages.

## Providers

| Name           | Company      | Env                                           | Batch | Stream | Limits found on 2026-10-17                                     |
| -------------- | ------------ | --------------------------------------------- | ----- | ------ | -------------------------------------------------------------- |
| `azure-pa`     | azure        | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`     | yes   | no     | 30 s maximum, en-US only, biased mode only, no word confidence |
| `azure`        | azure        | same                                          | yes   | no     | en-PH, no word confidence (phrase confidence used)             |
| `deepgram`     | deepgram     | `DEEPGRAM_API_KEY`, `DEEPGRAM_HOST`           | yes   | yes    | no Southeast Asia region                                       |
| `assemblyai`   | assemblyai   | `ASSEMBLYAI_API_KEY`, `ASSEMBLYAI_HOST`       | yes   | yes    | no Asia region                                                 |
| `google`       | google       | `GOOGLE_ACCESS_TOKEN`, `GOOGLE_PROJECT`       | yes   | no     | 60 s maximum, streaming is gRPC only, confidence not reliable  |
| `speechmatics` | speechmatics | `SPEECHMATICS_API_KEY`, `SPEECHMATICS_REGION` | yes   | yes    | no Asia region; batch path from memory, try `--limit 1` first  |

No child-speech specialist has a self-serve API: SoapBox Labs is no longer offered, and KidSense is licensed to device makers only. Speechace has an oral reading fluency product and a Singapore endpoint, but it needs a paid subscription and is not built for children. It is listed in `vendors.json` and not tested.

Recordings longer than a provider's limit are recorded as `too_long` without being sent.

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

Sends each recording to each provider, with (`biased`) and without (`plain`) the passage text, by batch and by streaming where supported. Only recordings whose guardian ticked that vendor are sent. Results go to `results/` in the data folder, with the model, locale, endpoint, region and date of each call. On a rerun, finished calls and recordings too long for a provider are skipped, and failed calls (an expired token, a timeout) are retried. `--force` resends everything. Use `--limit 3` for a first try.

At the end of each provider the run prints how many calls failed and how many vendor deletions failed. If any deletion failed, delete those jobs in the vendor's dashboard and note it on BB-22, as PROTOCOL.md promises.

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

Runs cover different recordings: consent is per company, calls fail, and Azure assessment (30 s) and Google (60 s) cannot take long audio. So the report has no single shared set. It shows each run on its own recordings, a head-to-head per tier among the runs that cover at least 80% of that tier, and pairwise tables for runs with partial coverage. A run with no successful results never shrinks a table.

## Decision rule

PROPOSED by the harness author, for James to confirm or change before the first real run. Writing it down first stops the numbers from choosing the rule.

1. **Gates.** A candidate must return per-word timestamps, offer zero retention or deletion, and cover all three tiers. A provider that cannot take tier 3 audio can only be the runner-up or a second engine for short passages.
2. **Minimum evidence.** The head-to-head for each tier needs at least 15 shared recordings from at least 8 readers. Below that, the result is reported as inconclusive and we record more before deciding.
3. **Primary metric.** False error rate, pooled across the three tier head-to-heads, using each provider's better mode (plain or biased) and batch transport.
4. **Ceiling.** A run whose missed error rate is above 25% is out, however low its false error rate. A provider that accepts every misreading is not useful to a reading teacher.
5. **Tie-break.** If two candidates' false error rate intervals overlap, prefer in order: streaming with word timings, real per-word confidence, a Southeast Asia region, then lower price per 1000 minutes.
6. **Fairness check.** Before the ADR, compare the winner's false error rate across age bands and first languages. A group more than twice the overall rate is written up in the ADR as a known risk for BB-40.

## Privacy rules the code enforces

- The logger only accepts recording IDs, group fields, statuses, counts and timings.
- Vendor error bodies are dropped unless `BAKEOFF_DEBUG=1`.
- Only audio and passage text are sent to vendors. Reader fields never leave the data folder.
- The report hides any group with fewer than 5 recordings or 3 readers, and never prints reader codes.
