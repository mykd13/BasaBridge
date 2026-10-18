# 0006 Email provider

Status: accepted. Date: 2026-10-17.

## Problem

Guardian approvals, password resets and, later, weekly parent summaries need email that arrives. Parents read it on a phone. A bounced guardian address must be noticed, because the learner is waiting for approval. Messages must never carry a learner's name, story text or scores.

## Options

- **Resend.** In the Vercel Marketplace, so keys are set per environment from Vercel. A simple HTTP API, webhooks for bounces and complaints, and a free tier large enough for a pilot.
- **Postmark.** Strong deliverability and separate streams for important mail. Not in the Vercel Marketplace, so keys are managed by hand.
- **Amazon SES.** Cheapest at volume. Needs an AWS account, a request to leave the sandbox, and SNS for bounces.

## Decision

Use **Resend**, called over its HTTP API with no SDK.

- All mail goes through one `Mailer` interface and one `sendEmail` function in `apps/web/src/server/email`.
- Local development and tests use a capture mailer that keeps messages in memory and sends nothing.
- Production refuses to start sending without `RESEND_API_KEY` and `EMAIL_FROM`, so a missing key fails loudly instead of dropping mail.
- Logs name the template only. They never include the address or a link.
- Templates take links and numbers only. There is no input for a name, username, story text or score.
- Templates are in English and Filipino, as plain text and simple HTML.
- Resend webhooks report permanent bounces and complaints. The webhook checks the Svix signature and a 5 minute time window, then stores an HMAC-SHA256 of the address, keyed with `EMAIL_HASH_SECRET`, in `email_suppressions`. A plain hash of an email can be tested offline against guessed addresses; a keyed one cannot without the secret. `sendEmail` refuses suppressed addresses and returns `suppressed`, so the caller can tell the learner (BB-8).

## Consequences

- New variables: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM`, `EMAIL_HASH_SECRET`.
- New table: `email_suppressions`, holding keyed hashes only, with `reason` limited to `bounce` or `complaint`.
- `EMAIL_HASH_SECRET` is set once per database. Changing it makes every stored suppression unmatchable.
- When BB-7 merges, its password reset uses this module instead of its own console mailer.
- Moving to another provider means writing one new `Mailer` and one new webhook parser.

## Manual setup still to do

1. Add Resend from the Vercel Marketplace and connect it to the project for all three environments.
2. Set `EMAIL_FROM` and `RESEND_WEBHOOK_SECRET` in Vercel for each environment.
3. Add a sending domain in Resend. This needs the production domain (BB-67). Add the SPF, DKIM and DMARC records Resend shows to the domain's DNS.
4. In Resend, add a webhook to `https://<domain>/api/email/webhook` for `email.bounced` and `email.complained`.
5. Send each template to real Gmail, Yahoo and Outlook inboxes on a phone and check they land in the inbox, not spam.

## Open

- The Filipino wording needs a check by a native speaker before pilot.
- The weekly summary template waits for BB-76.
- Whether parents reply to `EMAIL_FROM` or to a separate support address.
