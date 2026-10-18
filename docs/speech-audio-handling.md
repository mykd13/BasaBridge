# Speech audio handling (BB-30)

Children's voice is the most sensitive data in the system. The code is in `packages/speech/src/audio.ts`.

## Rules

- **Default:** a recording is analysed in memory and dropped. Nothing is written to disk or storage.
- **Retention on:** the learner turned on "keep my recordings". The recording is stored only after analysis succeeds. It is encrypted with AES-256-GCM, a fresh random IV each time, and the key comes from `AUDIO_ENCRYPTION_KEY`. Storage keys hold a try ID and a random ID, never a name or username.
- **Expiry:** each stored recording expires 30 days after it was made. `purgeExpiredAudio` deletes the blob first, then the row. It runs on a schedule.
- **Learner control:** a learner can list, play and delete their own recordings. Other learners cannot.
- **Parents:** parents never get audio. The authorization layer (BB-10) must refuse any parent request for audio. The functions in `audio.ts` do not check who is asking.
- **Account deletion:** call `deleteAccountAudio` before `deleteUser`. The database cascade removes rows only, so without this call the encrypted blobs would stay in storage.

## Speech provider settings

Rule: use the provider's no-retention or zero-data-retention mode, and turn off training on our data, wherever the provider offers it. No names or usernames are sent with audio.

The provider is chosen in BB-22 and its terms for children's data are checked in BB-41. Until then:

| Provider             | Setting used                     | Status                                                              |
| -------------------- | -------------------------------- | ------------------------------------------------------------------- |
| To be chosen (BB-22) | Zero data retention, no training | Pending. Record the exact setting here when the provider is chosen. |

## Still to wire up

- A real encrypted bucket behind `AudioStore`, and a Drizzle implementation of `AudioRecordRepo` over `audio_objects`.
- The authorization layer wrapper (BB-10), including the parent denial.
- A scheduled job that calls `purgeExpiredAudio`.
- Calling `deleteAccountAudio` in the delete-account flow.
