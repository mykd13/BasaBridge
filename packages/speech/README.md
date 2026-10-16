# @basabridge/speech

Speech provider interface, adapter guards and a fake provider (BB-24).

## Use it

```ts
import { createSpeechProvider, SpeechError } from '@basabridge/speech';

const speech = createSpeechProvider(); // reads SPEECH_PROVIDER, SPEECH_API_KEY, SPEECH_TIMEOUT_MS
try {
  const words = await speech.transcribe(audio, { referenceText });
} catch (e) {
  if (e instanceof SpeechError) show(e.userMessage, e.retryable);
}
```

Set `SPEECH_PROVIDER=fake` for local work and tests. The fake never reads the audio.

## Add the real provider (after BB-22)

1. Write a class that implements `SpeechProvider` in its own file. Pass `referenceText` to the provider when it supports biasing, and set `supportsBiasing`.
2. Throw `SpeechError('not_configured')` when the API key is missing.
3. Register it by name in `REGISTRY` in `src/config.ts`.

`withSpeechGuards` already handles timeouts, aborts, empty results and bad word data, so the adapter only needs to map provider specific failures (it may throw an object with a `status`).

Never log audio, names or the reference text.
