# 0005 Text-to-speech provider

Status: accepted, pending the native speaker check. Date: 2026-10-17.

## Decision

- Interface audio uses Azure Speech text-to-speech, called over its REST API from the server. No SDK is added.
- Voices: `en-US-AnaNeural` for English and `fil-PH-BlessicaNeural` for Filipino. Both are set in one place in `packages/speech/src/tts.ts`.
- Output is 24 kHz mono mp3.
- Fixed interface sentences are generated at build time into static files. Questions, options and teacher notes are generated on demand and cached by a SHA-256 hash of the language and normalised text.
- The browser's own speech voices are the fallback when the service fails.
- Configuration is `TTS_PROVIDER`, `TTS_API_KEY`, `TTS_REGION` and `TTS_COST_PER_MILLION_CHARS` (see `example.env`).

## Why

Azure offers a Filipino neural voice, which is the hard requirement. The adapter sits behind the `TtsProvider` interface, so changing provider touches one file.

## What is sent

Only the sentence to be spoken and its language. No names, usernames, audio or learner ids. Logs carry language, character count, cost and failure status, never the text.

The route enforces this for now by speaking only fixed interface sentences. `POST /api/tts` accepts text only if its hash is in the fixed list (`apps/web/src/audio/fixed-sentences.json`, later the BB-58 catalog) and answers 400 for anything else, so free text never reaches the provider. The browser then uses its own voice. It also has a text size cap, a best-effort rate limit (per server instance, keyed on a header the caller may control, so not a real control) and a size cap on the cache. There is no sign-in check yet.

Questions, options and teacher notes are spoken on demand by `speakCached`, but the route cannot serve them until the authorization layer (BB-10) exists. Then the route should take an id (a question id or note id), look the text up there, check the caller may hear it, and send only that text to the provider. Until then those texts use browser voices, and `TTS_API_KEY` should stay unset in every shared environment.

## Rules before use

- No real learner traffic may use this provider until BB-41 has read the Azure terms for children's use.
- The generated mp3 files for fixed sentences are committed as static assets. `pnpm audio:generate` makes them and is never part of `pnpm build`. After a voice change, run it with `--force`.

## Open items

- **Native speaker check.** A native Filipino speaker must listen to the Filipino voice and a sample of fixed sentences before launch. If the voice is not good enough, change the voice name or the provider.
- **Children's use terms (for BB-41).** Not yet read. BB-41 must confirm for the Azure tier in use: whether text and generated audio are retained or used for training, where they are processed, and whether the terms suit a product used by children under 13.
- **Cache store.** The cache is in memory behind the `TtsCache` interface until the Vercel project exists (BB-2). Replace it with a durable blob store then. Until then each server instance generates a sentence once.
- **Price.** Cost per million characters is set by configuration. Check it against the current Azure price list when the account is created.
