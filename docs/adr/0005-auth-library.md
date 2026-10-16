# 0005 Auth library

Status: proposed. Date: 2026-10-17.

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
- A student with no email and no linked parent cannot reset a password. The recovery code in BB-62 covers that case. Until then the sign-up screen says so plainly.
- If Better Auth stops fitting, the surface we use is small: sign up, sign in, sign out, session lookup and reset.

## Open

- Real email provider and sender domain.
- Lockout numbers (tuned in `apps/web/src/server/auth/config.ts`).
