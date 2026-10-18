# Privacy notice, terms and kids summary

The privacy notice, the terms and the privacy summary for kids are pages anyone can read without signing in (BB-69). Consent text is a locked area (Rhett and James). All of the text today is a placeholder that says it is awaiting qualified review. It is not legal advice and not the final wording.

## Where things are

| What              | Where                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Pages             | `/privacy`, `/terms`, `/privacy/kids` in `apps/web/src/app/(signed-out)`                                |
| Text              | `apps/web/src/legal/*.md`: `privacy`, `terms` in `en` and `fil`, and `kids.{en,fil}.simple.md`          |
| Versions          | `apps/web/src/legal/versions.ts`: `LEGAL_VERSIONS` and `getLegalDoc(kind, lang)`                        |
| Provider list     | `apps/web/src/legal/providers.ts`, drawn as a table inside the privacy notice                           |
| Consent interface | `apps/web/src/server/consent.ts`: `recordConsent`, `latestConsent`, `requireCurrentConsent`             |
| Contact address   | `PRIVACY_CONTACT_EMAIL` (see `example.env`)                                                             |
| Links             | `LegalLinks` in the footer of both shells and of the signed-out pages (sign in, sign up, the documents) |

## Changing the text

1. Edit the markdown. Keep the English and Filipino files on the same headings, with the same `{#id}` in the same order. A test checks it.
2. Raise the number for that document in `LEGAL_VERSIONS`. Versions are whole numbers because `consents.version` is an integer.
3. Put the new version and hash in `content-hashes.json`. The failing test prints the exact line.

A signed-in user whose stored version is lower than the current one is sent to `/consent/update` by the `(student)` and `(parent)` layouts. The first text that counsel signs off must have a higher number than the draft, so everyone who agreed to a draft is asked again.

## The kids summary

Its sentences are catalog keys under `legal.kids`, all marked `spoken`, so `pnpm i18n:audio` gives them audio. The markdown file holds the headings and says which sentences go in which paragraph with `[[legal.kids.what1]]`. Each paragraph has a speaker button that reads its sentences in order. Until the pre-generated audio from BB-57 is on main, the button uses the browser voice.

## Provider list

Each entry says what a provider sees and never sees. A test fails when `example.env` has a `*_PROVIDER` or `*_MODEL` variable that no entry lists in `envVars`. Add the entry in the same pull request that adds the variable.

## Contact address

`PRIVACY_CONTACT_EMAIL` must be set for a production deployment (`VERCEL_ENV=production`). The build stops with a message if it is empty or not an email address. Everywhere else the pages say the address is not set, so a missing value is visible.

## Human work still open

- Legal text for all three documents from someone qualified in the Data Privacy Act (RA 10173) and children's data. This is the BB-41 review.
- Sign-off from Rhett and James.
- A native Filipino check, and a simple-wording check of the kids summary.
- Reading each provider's terms for children's data (`docs/security/provider-terms.md`) and correcting the sees and never-sees lines.
- Naming who monitors the contact address.
