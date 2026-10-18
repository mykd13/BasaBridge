# Accessibility checklist

Manual steps for checking a screen before it ships. The automated checks catch a lot, but they cannot hear a screen reader or judge whether a page makes sense. Run this list for every new or changed screen, and once before each release.

Target: WCAG 2.2 level AA.

## What the automated checks cover

These run in `apps/web/e2e/a11y` with `pnpm --filter @basabridge/web e2e`. You do not need to repeat them by hand.

| Check                                    | Spec                | What it proves                                                   |
| ---------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| axe-core, serious and critical           | `axe.spec.ts`       | Every route, English and Filipino, light, dark and high contrast |
| One h1, one main, no skipped headings    | `structure.spec.ts` | Page outline is sound                                            |
| Keyboard walk and visible focus          | `keyboard.spec.ts`  | Every control is reachable with Tab and shows a focus indicator  |
| 360px, 200% text, Filipino, reading help | `layout.spec.ts`    | No sideways scroll, no offscreen or clipped text                 |
| Reduced motion                           | `motion.spec.ts`    | No animation or smooth scroll when the setting is on             |

Limits to know about:

- axe finds about a third of real problems. A pass is not a sign-off.
- The keyboard walk is skipped in WebKit on macOS, because Safari does not Tab to links unless you hold Option. Check Safari by hand (see Keyboard).
- The checks use the dev server, so they cannot judge real speech, real devices or real TalkBack behaviour.

## Setup

- Test with a real account type for the screen: student for `/home`, `/progress`, `/learn`, `/account`; parent for `/parent/...`.
- Test in English, then Filipino. Filipino text runs longer.
- Keep a phone at 360px width or a browser window resized to match.

## Screen reader

Run each flow with the screen reader on and the screen turned away from you if you can.

### VoiceOver on macOS and iOS

- macOS: Cmd+F5 to start. Use Safari.
- iOS: Settings, Accessibility, VoiceOver.
- Check:
  - The page title is read when the page opens.
  - The rotor (Ctrl+Option+U on macOS) lists one h1 and headings in order.
  - The landmarks list shows one main, plus navigation.
  - Every button and link says what it does without its surroundings.
  - The progress bar is read once, not twice.
  - Form errors are read when they appear.
  - Focus moves to the new page content after a menu link is used.

### TalkBack on Android

- Settings, Accessibility, TalkBack. Use Chrome.
- Check the same list as VoiceOver, plus:
  - Swipe order matches the visual order.
  - Touch targets are at least 48px and are easy to hit with explore by touch.
  - The reading help settings are announced with their state ("Large text, selected").

### Main flows to cover

1. Sign in, then open the menu and go to My progress and back.
2. Home, then Learn, then a lesson list at `/learn/words`.
3. Account, then Reading help: change text size, spacing and the ruler.
4. Parent: link a learner, open the progress, readings, levels and decisions screens.
5. Privacy, Terms and the kids summary, signed out.
6. A page that does not exist (the not found page).

## Keyboard

Put the mouse away.

- Tab moves forward and Shift+Tab moves back through every control, in reading order.
- A visible focus ring shows on every stop, in light, dark and high contrast.
- Enter activates links and buttons. Space activates buttons and checkboxes.
- Arrow keys move inside radio groups and tabs.
- Escape closes anything that opened over the page.
- No keyboard trap: you can always leave a part of the page.
- The skip link is the first stop. Enter on it moves focus to the main content.
- Safari on macOS: hold Option while you press Tab, or turn on "Press Tab to highlight each item" in Safari settings, Advanced.

## Zoom and reflow

- Browser zoom to 200% (Cmd or Ctrl and plus). Nothing is lost, overlapped or cut off.
- Browser zoom to 400% at 1280px wide (equal to 320px). Content reflows to one column. No sideways scroll, except for tables and code.
- Set the system text size to the largest on iOS and Android. Open the main flows. Text grows and buttons stay readable.
- Check Filipino at 200%. Long words such as "Pagsusuri ng pagbasa" must wrap, not run off the screen.

## Contrast and colour

- Text is at least 4.5:1 against its background. Large text (24px, or 19px bold) is at least 3:1.
- Icons and borders that carry meaning are at least 3:1.
- Check light, dark and high contrast. Colours come from tokens in `packages/ui/src/tokens.css`. Fix a failing colour in the token, not in one screen.
- Colour is never the only signal. A correct or wrong answer also has an icon or words.
- Turn on the system "Increase contrast" setting and check the parent screens follow it.

## Reading supports

- Large text, wide line spacing and the reading ruler work on every student screen, alone and together.
- With all three on, nothing overlaps and nothing scrolls sideways at 360px.
- High contrast from reading help changes the whole student app, including the menu.
- Listen buttons have a clear name and show when they are playing.
- The ruler can be moved with the keyboard.
- Every accommodation is recorded (see AGENTS.md, rule 12). Check that turning one on does not hide anything from the parent view.

## Motion

- Turn on "Reduce motion" in the system settings. Reload.
- Nothing slides, fades or spins by itself. The loading ring may stay, because it shows work is happening.
- No smooth scroll.

## Content

- Page titles are unique and say where you are.
- Link text makes sense alone. Avoid "click here".
- Images that carry meaning have text alternatives. Decorative ones are hidden from screen readers.
- Error messages say what went wrong and how to fix it, in words a child can follow.
- Language is set on the page (`en` or `fil`), so screen readers use the right voice.

## Recording a run

Copy the template, fill it in, and add it under "Runs" below. Keep each run short.

```
### Date, who, build

- Screens:
- Tools and devices:
- Passed:
- Failed or open (with issue links):
- Not checked and why:
```

## Runs

### 2026-10-19, Ivy (QA), BB-37 part 1

Scope: the screens on main. The reading and question screens (BB-32, BB-33) and the Learn drafts (#56) wait for part 2.

- Screens: student shell and menu, `/home`, `/progress`, `/account`, `/account/help`, `/learn`, `/learn/words`, `/placement`, `/placement/result`, `/consent/update`; parent shell, `/parent/link`, `/parent/[learner]` with readings, levels, decisions and privacy; `/sign-in`, `/sign-up`, `/privacy`, `/terms`, `/privacy/kids`, the not found page.
- How:
  - axe-core on every route, in English and Filipino, light, dark and high contrast: no serious or critical findings.
  - Playwright keyboard walk, structure, layout (360px, 200% text, Filipino, reading help at its largest) and reduced motion checks, on Chromium, Firefox, WebKit and a 360px phone profile.
- Found and fixed:
  - Parent Readings screen jumped from h1 to h3. Now h2.
  - The progress value was read twice on the student and parent progress screens. The bar is now hidden from assistive tech, and the paragraph beside it carries the words.
  - The reduced motion rule missed `button.bb-option`. It is now a catch-all.
  - Parent progress screen scrolled sideways at 360px and 200% text. The grid now shrinks to fit.
  - A long chip label ("Pagsusuri ng pagbasa") ran off the screen at 360px, Filipino and 200% text. Chips now wrap.
- Found and not fixed:
  - `/consent/update` for a student sits outside the student layout, so reading help (large text, spacing, contrast) does not apply there. To do in part 2 or with the owner of that screen.
- Not checked: **VoiceOver and TalkBack were not run in this pass.** A person with the devices needs to walk the main flows above and add a run here. Safari keyboard use is covered by the manual steps only, because the automated walk skips WebKit. Real Filipino review is still pending (Filipino text is marked unreviewed).
