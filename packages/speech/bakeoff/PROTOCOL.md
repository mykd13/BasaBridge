# Speech bake-off: recording and data protocol

Status: DRAFT for review by Rhett (consent, age gate and retention are a locked area shared by Rhett and James). Do not start recording until Rhett approves this file and [CONSENT.md](CONSENT.md).

Owner: James. Issue: BB-22.

## Why we are recording

BasaBridge listens to children read aloud. Speech recognition is known to work less well on children's voices and on Philippine-accented English. Before we build on a speech provider, we test several on real recordings and pick the one that makes the fewest unfair mistakes. The recordings are used for this test only. They are never used to train a model and never shipped in the app.

## Who takes part

- Children and young people aged 6 to 17 who read English with a Philippine accent.
- 20 to 30 readers in total, spread across the age bands below.
- Each reader reads 3 or 4 short passages. A session takes about 10 minutes.
- Readers are found through people the team already knows: family, friends and, with the school's written permission, a partner school. No one is paid. A small thank-you (a snack or a sticker) is fine.

## Consent

- A parent or guardian gives written consent for every reader under 18, using the guardian form in [CONSENT.md](CONSENT.md).
- The reader is also asked, in simple words, whether they want to take part (the child script in CONSENT.md). If the child says no, or looks unhappy, we stop, even if the guardian said yes.
- The guardian consents separately to sending the recordings to each named speech company. If they do not agree to a company, that reader's recordings are not sent to it.
- Signed forms are kept apart from the recordings (see Storage).

## What we collect

For each recording, and nothing else:

| Field          | Values                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Reader code    | `R01`, `R02` and so on. Assigned by us. Not derived from the name.                                             |
| Age band       | `6-8`, `9-11`, `12-14`, `15-17`                                                                                |
| First language | `tagalog`, `cebuano`, `ilocano`, `hiligaynon`, `bikol`, `waray`, `kapampangan`, `other-ph`, `english`, `other` |
| Device         | `laptop`, `phone`, `tablet`                                                                                    |
| Room           | `quiet`, `noisy`                                                                                               |
| Passage        | The passage ID from [passages.json](passages.json)                                                             |
| Audio          | The recording itself                                                                                           |

We do **not** collect names, exact ages, birthdays, schools, addresses, photos, video or contact details of the reader. The guardian's name and signature appear only on the consent form.

## Recording a session

1. Check the signed consent form, then ask the child script questions.
2. Assign the next free reader code. Write it on the consent form. That form is the only place the code and a name appear together.
3. Pick passages so each reader covers at least two tiers, and so each passage gets about the same number of readers.
4. Record each passage as its own file. Say nothing identifying while recording. Do not say the child's name, the school or the place.
5. Aim for a mix: about half on a laptop microphone, half on a phone, and about a third in a noisy room (a classroom, a living room with a TV on, a street-facing window).
6. Convert each file to 16 kHz, mono, 16-bit WAV and name it only by recording ID, for example `rec-0042.wav`. Delete the original phone or laptop file once the WAV is checked.
7. Add one row to `manifest.csv` (template in [templates/manifest.csv](templates/manifest.csv)).

## Storage

- All recordings, transcripts, `manifest.csv` and provider results live in one folder on an encrypted drive (for example a VeraCrypt container or an encrypted, two-factor protected shared folder). Only James, the annotators and Rhett have access.
- The harness finds that folder through the `BAKEOFF_DATA_DIR` environment variable. It refuses to run if the folder is inside the repository.
- Consent forms (paper or scans) are stored in a different place from the recordings, also protected, so a leak of one does not expose the other.
- Never put recordings, transcripts or the manifest in the repository, Linear, Slack, email, chat apps, or any AI tool, including coding assistants. Annotators listen on their own computer from the encrypted folder.

## Sending audio to speech companies

- Only the audio file and the passage text are sent. Reader code, age band, language, device and room stay with us.
- Only the companies named in the consent form, and only for readers whose guardian ticked that company.
- We use each company's zero-retention or no-training option where it exists, and delete jobs and transcripts through their API straight after we receive the result. The exact setting for each company, and the date we checked its terms, are recorded in the report.
- If a deletion fails, the harness counts it and says so at the end of the run. James then deletes the job in the company's dashboard and notes it on BB-22.
- The harness never logs audio, transcript text or the passage text. Logs show recording IDs, the group fields and HTTP status codes only.

### What each company does with the audio (checked 2026-10-17)

For Rhett to read next to the consent text. Sources are in [vendors.json](vendors.json).

| Company      | Where     | What happens to the audio                                                                                                                             | Children in their terms                                                                    |
| ------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Microsoft    | Singapore | Not stored for the request types we use (fast transcription, pronunciation assessment).                                                               | Nothing found in the Speech docs. Product Terms not checked. Microsoft DPA.                |
| Deepgram     | US        | Not stored after the response when we send `mip_opt_out=true`, which we always do. Otherwise used for model improvement by default.                   | Account holders must be 18 or older. Nothing on end users who are children. No public DPA. |
| AssemblyAI   | US        | Kept 24 to 48 hours (audio) and 30 days (transcripts) by default, and used for training unless opted out. We delete each job and opt out of training. | Silent on children. DPA published.                                                         |
| Google       | US        | Not logged unless we opt in, which we do not.                                                                                                         | Only child-abuse wording in the acceptable use policy. Google DPA.                         |
| Speechmatics | EU        | Kept 7 days by default, not used for training unless we opt in. We delete each job.                                                                   | Nothing found. Processor terms in their terms of service.                                  |

None of the five companies says anything specific about processing children's voices. That is a reason for Rhett to decide whether a qualified review is needed first (open question 1).

## What goes into the repository

Only aggregated numbers: error rates, timing and latency, by provider and by group. A group with fewer than 5 recordings or fewer than 3 readers is not shown, so no single child can be picked out.

## How long we keep it

- Recordings, transcripts, the manifest and provider results are deleted when the speech provider ADR is accepted, and no later than [DATE, to be set by Rhett].
- Signed consent forms are kept as proof of consent until [DATE, to be set by Rhett], then shredded or deleted.
- James confirms the deletion in a Linear comment on BB-22.

## Withdrawing

A guardian or reader can withdraw at any time before deletion by telling James. We delete that reader's recordings, transcripts and results within 7 days and rerun the report without them. Nobody has to give a reason.

## If something goes wrong

If recordings or consent forms may have been seen by someone who should not see them, tell James and Rhett the same day. Rhett decides whether guardians and the National Privacy Commission must be told, following the Data Privacy Act breach rules.

## Roles

- James: runs sessions, holds the data folder, deletes the data at the end.
- Annotators: transcribe recordings following [ANNOTATION.md](ANNOTATION.md). They see audio and reader codes only, and sign the undertaking below before they get access.
- Rhett: reviews this protocol and the consent text, decides retention dates and breach handling.

### Annotator undertaking

Each annotator signs this before getting access to the data folder. James keeps the signed copies with the consent forms.

> I will listen to the bake-off recordings only to transcribe them for BasaBridge. I will not copy, share, upload or play them to anyone, and I will not try to find out who any reader is. If I recognise a voice, I will stop and tell James, and someone else will transcribe that recording. I will work only from the encrypted folder and will not keep any copy on my own devices or in any other app, including AI tools. When the bake-off ends, or if I stop helping, I will confirm to James that I hold no copies.

Name: ______________________

Signature: ______________________ Date: ____________

## Open questions for Rhett

1. Should someone qualified in the Data Privacy Act look at this before recording starts, given that PLAN.md section 9 asks for that review before launch?
2. Do we need the consent form in Filipino or another local language as well as English?
3. If we record at a school, is a letter from the school head enough, or do we need more?
4. What deletion dates do you want in the two blanks above?
