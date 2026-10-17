/** Auth numbers in one place so they can be tuned without touching the flows (ADR 0005). */
export const authConfig = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  minUsernameLength: 3,
  maxUsernameLength: 20,
  minSecretLength: 32,
  /** A cookie session lasts 30 days and is refreshed once a day while in use. */
  sessionSeconds: 60 * 60 * 24 * 30,
  sessionRefreshSeconds: 60 * 60 * 24,
  /** Lockout: more than this many sign-in attempts for one account within the window locks it. */
  lockoutMaxFailures: 5,
  lockoutWindowMinutes: 15,
  /** Per address limits from the Better Auth rate limiter. */
  signInPerMinute: 10,
  resetRequestsPerHour: 5,
  passwordChangesPerHour: 10,
  /** Students who give no email get this reserved domain. It can never receive mail. */
  noEmailDomain: 'students.basabridge.invalid',
} as const;

/**
 * Stable codes the screens turn into words. Learner-facing text lives in the i18n catalog in
 * English and Filipino, simple and standard wording (BB-12, BB-58), never in the server.
 *
 * NO_EMAIL: the student gave no email, so password reset will not work. Say so plainly.
 * ACCOUNT_LOCKED: sent as the error code with `retryAfterMinutes` when sign-in is locked.
 */
export const AUTH_CODES = {
  noEmail: 'NO_EMAIL',
  accountLocked: 'ACCOUNT_LOCKED',
  emailNotAllowed: 'EMAIL_NOT_ALLOWED',
} as const;
