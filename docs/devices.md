# Supported devices and connections (BB-71)

BasaBridge has to work on low-cost phones, on slow connections and on devices that several students share.
This page lists what we support and what still needs people with real devices.

## Supported browsers

| Browser                   | Supported versions | Why it matters                            |
| ------------------------- | ------------------ | ----------------------------------------- |
| Chrome (Android, desktop) | Last 2 versions    | Most low-cost Android phones              |
| Edge                      | Last 2 versions    | School laptops                            |
| Samsung Internet          | Last 2 versions    | Default browser on many Samsung phones    |
| Safari on iOS and macOS   | 16.4 or later      | Every browser on iOS runs Safari's engine |
| Firefox                   | ESR or later       | Some school machines                      |

The reading flow also needs `MediaRecorder` (to record) and streamed `fetch` bodies (to upload audio in pieces).
The app checks for those features, not only the browser name, in `apps/web/src/lib/browser-support.ts`.
A browser that fails the check sees a notice. It can still sign in.

The code floors in `browser-support.ts` and the `browserslist` in `apps/web/package.json` follow this table.
"Last 2 versions" moves every few weeks, so the code floor is set lower on purpose. Review both when this table changes.

## Phones and connections

- Layout works at 360 px wide. Every button, option and tab is at least 48 px tall.
- First-load JavaScript stays under 170 kB (gzip) per route. `pnpm --filter @basabridge/web check:bundle` checks it after a build.
- Read, questions and Learn show a loading screen while they load.
- Requests that fail on a bad connection are retried 3 times (`fetchWithRetry`). The screen keeps what it shows.

## Shared devices

- Sign out removes this tab's `bb:` session keys and loads the sign-in page fresh.
- Learner and parent pages send `Cache-Control: no-store`, so Back cannot show the last person's page.
- A learner sees a warning after 25 minutes idle and is signed out at 30.
- The server must also end idle student sessions at 30 minutes. That needs a change to BB-7 (Rhett). Until then a
  closed tab keeps its session cookie.

## Checks

| Check                        | Command                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| Browser and retry unit tests | `pnpm test`                                                               |
| 360 px layout, slow network  | `pnpm --filter @basabridge/web exec playwright test --project=mobile-360` |
| All browsers                 | `pnpm --filter @basabridge/web e2e`                                       |
| Bundle size                  | `pnpm --filter @basabridge/web check:bundle`                              |

Playwright runs against the dev server with `BB_DEV_ROLE=student`, because sign in is not built yet (BB-7).
The two-account shared-device test is marked `fixme` until sign in and sign up exist.

## Pilot devices

Fill this in during the pilot. One row per device a student used. Do not write student names.

| Device (make and model) | OS and version | Browser and version | Screen width | Connection | Read aloud works | Layout OK | Notes |
| ----------------------- | -------------- | ------------------- | ------------ | ---------- | ---------------- | --------- | ----- |
|                         |                |                     |              |            |                  |           |       |
|                         |                |                     |              |            |                  |           |       |
|                         |                |                     |              |            |                  |           |       |

## Still to do by people

- Fill in the pilot devices table.
- Try the reading flow on real low-cost phones (Android Chrome, Samsung Internet, an iPhone on Safari 16.4 or later).
- Test on a real 3G connection, not only simulated delays.
