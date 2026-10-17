# Microphone capture: browser notes (BB-23)

Code: `packages/speech/src/capture`. Screens: `apps/web/src/app/read`.

## What each browser does

| Browser (desktop) | Recording format | Notes                                                                                               |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| Chrome            | webm / opus      | Permission query for the microphone works, so a stored block shows as "blocked".                    |
| Edge              | webm / opus      | Same engine as Chrome.                                                                              |
| Safari            | mp4 (aac)        | No webm. The permission query rejects the name "microphone", so a refusal always shows as "denied". |
| Firefox           | webm or ogg opus | Not in the issue's list. It should work through the same code but has not been checked.             |

The first supported type from `RECORDING_TYPES` wins. If the speech provider chosen in BB-22 cannot read one of
these, change that list in one place.

## States reported to the screen

`denied` (prompt dismissed), `blocked` (browser setting), `no-device`, `unavailable` (another app holds the
microphone), `unsupported` (no recording API, or the page is not on https or localhost). The screen shows the
canvas D3 help for all of them, with "no microphone" wording for `no-device` and `unsupported`.

## Checked and not checked

- Checked in the Chromium browser pane: the real prompt path ends in a blocked state, and a synthetic audio
  stream records, shows the level meter, uploads in order with a final marker, and ends the track on stop.
- Not checked by hand yet: a real microphone, Safari, Edge, a real slow or dropped connection, and the browser
  indicator going off on each browser. These need a person with the devices.

## Known limits

- The try id is made in the browser for now. The server will issue it (BB-24), and the try count and the
  under-13 microphone gate stay on the server.
- The server route validates size, type, index and try id, and acknowledges chunks. It stores nothing, and it must not store or forward audio until BB-10 (authorization, learner ownership, Origin check) and BB-24 (server-issued try, under-13 gate) land. The try id travels in a header, not the URL.
- Recovery covers dropped requests and lost replies. If the tab is closed or reloaded mid try, that try is gone. A finished take keeps sending if the learner navigates inside the app, and Start again is disabled until it is sent.
