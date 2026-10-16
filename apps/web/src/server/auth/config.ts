/** Auth numbers in one place so they can be tuned without touching the flows (ADR 0005). */
export const authConfig = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  minUsernameLength: 3,
  maxUsernameLength: 20,
  /** A cookie session lasts 30 days and is refreshed once a day while in use. */
  sessionSeconds: 60 * 60 * 24 * 30,
  sessionRefreshSeconds: 60 * 60 * 24,
  /** Lockout: this many failed sign-ins for one username or email within the window locks it. */
  lockoutMaxFailures: 5,
  lockoutWindowMinutes: 15,
  /** Per address limits from the Better Auth rate limiter. */
  signInPerMinute: 10,
  resetRequestsPerHour: 5,
  /** Students who give no email get this reserved domain. It can never receive mail. */
  noEmailDomain: 'students.basabridge.invalid',
} as const;

/** Shown at sign-up when a student leaves email empty. Plain words, no jargon. */
export const NO_EMAIL_NOTICE =
  'You did not add an email. If you forget your password, we cannot reset it for you. Write your password down in a safe place.';
