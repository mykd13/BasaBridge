# 0005 Auth library

Status: accepted. Date: 2026-10-17.

## Problem

Students sign in with a username and a password. Email is optional and only used for password reset. Parents sign in with an email and a password. We need cookie sessions, safe password hashing, password reset by email, and rate limiting with lockout.

## Options

- **Better Auth.** Credentials are a first-class feature. A username plugin gives username sign-in. Password reset, cookie sessions, scrypt hashing and a rate limiter are built in. It has a Drizzle adapter and a Next.js handler. Tables and field names can be mapped onto ours.
- **Auth.js.** Its credentials provider is deliberately limited. Sessions for credentials need the JWT strategy, and password reset and username sign-in are ours to build.
- **Our own code.** Full control, but we would own password hashing, session rotation and reset tokens. That is the part of the app where a mistake costs the most.

## Decision

Use **Better Auth** with the Drizzle adapter, the `username` plugin and email and password sign-in.

- A parent account is created with an email. A student account is created with a username, and the email is optional.
- Better Auth requires an email on every user. A student who gives none gets a reserved address on the `.invalid` domain, which can never receive mail. The `users.email_real` flag tells reset code and screens whether a usable email exists. Reset is offered only when it is true.
- `name` is set to the username. We never store a real name (AGENTS.md rule 2).
- Passwords are hashed by Better Auth (scrypt) and stored in the `accounts` table, not on `users`.
- Sessions are cookie sessions stored in the database, so sign-out and lockout take effect at once.
- Rate limiting uses Better Auth's database storage. On top of that, sign-in has a per-username lockout (`sign_in_failures`), because a per-address limit does not stop an attacker who rotates addresses.

## Consequences

- `packages/db` gains `sessions`, `accounts`, `verifications`, `rate_limits` and `sign_in_failures`. `users` gains `name`, `email_verified`, `email_real`, and loses `password_hash`. This is a locked area and needs Rhett's agreement.
- The authorization layer (BB-10) reads the current user from the session helper in `apps/web/src/server/auth`. Pages and routes never read the session cookie themselves.
- Email goes through a small `Mailer` interface. No provider is chosen yet.
- `role`, `email_real` and `age_band` are declared `input: false`, so neither sign-up nor the public `/update-user` route can set them. Our server functions set them with a direct update after sign-up, and remove the user if that fails. The age band belongs to the age gate (BB-8).
- Lockout is one counter per account, keyed on the user id, so the username and email routes share it. Each attempt is recorded before the password is checked, so a parallel burst cannot slip past.
- Errors and notices are stable codes (`ACCOUNT_LOCKED`, `NO_EMAIL`). Learner-facing words live in the i18n catalog (BB-12, BB-58).
- A student with no email and no linked parent cannot reset a password. The recovery code in BB-62 covers that case. Until then the sign-up screen says so plainly.
- If Better Auth stops fitting, the surface we use is small: sign up, sign in, sign out, session lookup and reset.

## Trade-offs

- **Lockout can be used against a child.** More than five attempts in 15 minutes lock an account, so anyone who knows a username can keep it locked. We accept this for now. Keying on address and username together would let an attacker who rotates addresses guess freely. The window is short and the numbers live in `config.ts`. Revisit with BB-63.
- **Two database drivers.** The web app opens its own `pg` connection and `@basabridge/db` uses `postgres`. Check pooling on Neon for serverless before launch.

## Before production

- No step runs migrations on Vercel yet (deferred from BB-3). Without one the auth tables do not exist, and sign-up and sign-in fail.
- `BETTER_AUTH_URL` must be set in all three Vercel environments (add it to the BB-2 checklist). `AUTH_SECRET` needs at least 32 characters.
- Production uses a mailer that throws, so a reset request fails loudly until a provider is wired in (BB-64).
- Decide whether child sessions keep the IP address and user agent before the pilot (BB-41).

## Open

- Sessions store `ip_address` and `user_agent` by default. Decide if children's accounts should keep them, tracked with BB-41.
- Reset tokens are stored as plain text in `verifications` and expire fast. Hashing them is a later option.
- The per address limiter is a read-then-write and can leak a little under a burst. The per account lockout does not.
- Real email provider and sender domain.
- Lockout numbers (tuned in `apps/web/src/server/auth/config.ts`).
