/**
 * The address people write to about privacy. It comes from PRIVACY_CONTACT_EMAIL, never from the
 * documents, so one value is right everywhere (BB-69).
 */
const SIMPLE_EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** The configured address, or null when it is empty or not an email address. */
export function privacyContact(env: Record<string, string | undefined>): string | null {
  const value = env.PRIVACY_CONTACT_EMAIL?.trim();
  return value && SIMPLE_EMAIL.test(value) ? value : null;
}

/**
 * Throws when a production deployment has no usable contact address. `next.config.ts` calls it, so
 * the build stops. Local builds and CI do not set VERCEL_ENV, so they are not blocked, and the
 * pages say the address is missing instead of showing a made-up one.
 */
export function assertPrivacyContact(env: Record<string, string | undefined>): void {
  if (env.VERCEL_ENV !== 'production') return;
  if (privacyContact(env) === null) {
    throw new Error(
      'PRIVACY_CONTACT_EMAIL is empty or not an email address. A production build needs it, ' +
        'because the privacy notice tells people to write to it (BB-69).',
    );
  }
}
