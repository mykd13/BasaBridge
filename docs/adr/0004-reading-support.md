# 0004 Reading support in the interface

Status: accepted. Date: 2026-10-17.

## Problem

The learners who struggle most with reading must still read our buttons, instructions and questions. If the interface itself needs strong reading, we measure the interface, not the learner, and we lose the learners we most want to help.

## Principles

1. Do not make reading a barrier to using the app.
2. Separate what we measure from what we support. The story step measures decoding. Everything else may be supported, and every support is recorded.
3. Support is chosen with the learner, not imposed, and can change at any time.

## Decisions

1. **Spoken interface.** Every instruction and question has a speaker button. For levels 1 to 30 the first screen of each flow speaks automatically. Fixed interface sentences use pre-generated audio files in English and Filipino, stored as static assets. Questions, answer options and teacher notes use text-to-speech on demand, cached by a hash of the text. The browser's speech voices are the fallback.
2. **Icons with short words.** Every action has an icon from one consistent set, and the label is short. At low levels an instruction is at most eight words.
3. **Two wordings.** Interface text has a simple version and a standard version. The simple version is the default for levels 1 to 30 and can be turned on at any level.
4. **English and Filipino instructions.** The interface and its audio are available in both. Stories stay English, because the goal is English reading.
5. **Readable type.** Lexend and Atkinson Hyperlegible, larger default size, three text sizes, two line spacings, a reading ruler that highlights the line being read, left-aligned text, no italics or all capitals in body text, and a high-contrast option. No text inside images.
6. **Recorded accommodations.** Question read-aloud, listen-then-read and word tap are logged on the answers they affect. Question read-aloud does not change the weight of an answer, because the story step already measures decoding. A supported story try (listen-then-read) counts for less.
7. **Where supports are allowed.** Listen-then-read is offered only at levels 1 to 10 and is never used in placement. Tapping a word to hear it is allowed on the analysis screen, in Learn and in word practice, never during a try.
8. **Presets.** "Standard" and "More help". Placement recommends one. The learner can change any single setting. A parent cannot force a setting.

## Consequences

- Interface text goes through an i18n catalog from the first screen (BB-58). Hard-coded strings are a bug.
- Audio needs a text-to-speech service, a cache and a build step for fixed strings (BB-57).
- Settings live in `learner_settings.reading_help` and use the `ReadingHelp` shape in `packages/contracts`.
- The evidence flags on answers feed the ability model (ADR 0003) and the decision log.
- Whether the supports help real children is checked in learner testing after the build (BB-78).
