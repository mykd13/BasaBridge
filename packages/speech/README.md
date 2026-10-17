# @basabridge/speech

Speech provider interface, adapter guards and a fake provider (BB-24).

## Use it

```ts
import { createSpeechProvider, SpeechError } from '@basabridge/speech';

const speech = createSpeechProvider(); // reads SPEECH_PROVIDER, SPEECH_API_KEY, SPEECH_TIMEOUT_MS
try {
  const words = await speech.transcribe(audio, { referenceText });
} catch (e) {
  if (e instanceof SpeechError) show(t(e.messageKey), e.retryable); // wording comes from the i18n catalog;
}
```

Set `SPEECH_PROVIDER=fake` for local work and tests. The fake never reads the audio, and
`createSpeechProvider` refuses it when `NODE_ENV=production`. Never put it in a production env.
`SPEECH_TIMEOUT_MS` must be between 1000 and 120000. Other values use the 20000 default.

## Add the real provider (after BB-22)

1. Write a class that implements `SpeechProvider` in its own file. Pass `referenceText` to the provider when it supports biasing, and set `supportsBiasing`.
2. Throw `SpeechError('not_configured')` when the API key is missing.
3. Register it by name in `REGISTRY` in `src/config.ts`.
4. Check the provider account before launch: audio retention is off or as short as possible, and the account does not train on our audio (golden rule 3, BB-41). Record what you set in the PR.
5. Parse the raw provider response before returning it. Decide whether a word with no confidence is rejected or given a default, and say which in the PR (BB-22 finding).

`withSpeechGuards` already handles timeouts, aborts, empty results and bad word data, even when the adapter ignores the abort signal. The adapter only needs to map provider specific failures (it may throw an object with a `status`). The guard drops the original error, so do not rely on it being kept.

Never log audio, names or the reference text.
