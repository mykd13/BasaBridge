import { describe, expect, it } from 'vitest';
import { assertPrivacyContact, privacyContact } from './contact';

describe('privacy contact', () => {
  it('reads a trimmed address', () => {
    expect(privacyContact({ PRIVACY_CONTACT_EMAIL: ' privacy@example.org ' })).toBe(
      'privacy@example.org',
    );
  });

  it('is null when empty, missing or not an address', () => {
    expect(privacyContact({})).toBeNull();
    expect(privacyContact({ PRIVACY_CONTACT_EMAIL: '' })).toBeNull();
    expect(privacyContact({ PRIVACY_CONTACT_EMAIL: '   ' })).toBeNull();
    expect(privacyContact({ PRIVACY_CONTACT_EMAIL: 'not an email' })).toBeNull();
  });

  it('fails a production deployment with no address', () => {
    expect(() => assertPrivacyContact({ VERCEL_ENV: 'production' })).toThrow(
      /PRIVACY_CONTACT_EMAIL/,
    );
    expect(() =>
      assertPrivacyContact({ VERCEL_ENV: 'production', PRIVACY_CONTACT_EMAIL: '' }),
    ).toThrow(/PRIVACY_CONTACT_EMAIL/);
  });

  it('passes a production deployment with an address, and other builds without one', () => {
    expect(() =>
      assertPrivacyContact({
        VERCEL_ENV: 'production',
        PRIVACY_CONTACT_EMAIL: 'privacy@example.org',
      }),
    ).not.toThrow();
    expect(() => assertPrivacyContact({ VERCEL_ENV: 'preview' })).not.toThrow();
    expect(() => assertPrivacyContact({ NODE_ENV: 'production' })).not.toThrow();
    expect(() => assertPrivacyContact({})).not.toThrow();
  });
});
