import { describe, expect, it } from 'vitest';
import {
  checkPassword,
  checkUsernameField,
  looksLikeEmail,
  validateChangePassword,
  validateSignIn,
  validateSignUp,
} from './account-forms';

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe('account form validation', () => {
  it('checks the email shape without being the final judge', () => {
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
    expect(looksLikeEmail('a b@c.d')).toBe(false);
  });

  it('checks password length from the auth config', () => {
    expect(checkPassword('')).toBe('required');
    expect(checkPassword('short')).toBe('passwordShort');
    expect(checkPassword('long enough')).toBeNull();
    expect(checkPassword('x'.repeat(200))).toBe('passwordLong');
  });

  it('checks usernames for length, characters and the safety filter', () => {
    expect(checkUsernameField('')).toBe('required');
    expect(checkUsernameField('ab')).toBe('usernameLength');
    expect(checkUsernameField('has space')).toBe('usernameChars');
    expect(checkUsernameField('09171234567')).toBe('usernameNotAllowed');
    expect(checkUsernameField('bluefox42')).toBeNull();
  });

  it('asks for both fields on sign in', () => {
    const { state } = validateSignIn(form({}));
    expect(state?.fields).toEqual({ identifier: 'required', password: 'required' });
    expect(validateSignIn(form({ identifier: ' kim ', password: 'x' })).input.identifier).toBe(
      'kim',
    );
  });

  it('validates a student sign up and keeps email optional', () => {
    const ok = validateSignUp(
      form({ role: 'student', username: 'bluefox42', password: 'password1' }),
    );
    expect(ok.input).toEqual({ role: 'student', username: 'bluefox42', password: 'password1' });
    const bad = validateSignUp(
      form({ role: 'student', username: 'bluefox42', password: 'password1', email: 'nope' }),
    );
    expect(bad.state?.fields).toEqual({ email: 'emailInvalid' });
  });

  it('requires an email for a parent and ignores any username', () => {
    expect(validateSignUp(form({ role: 'parent', password: 'password1' })).state?.fields).toEqual({
      email: 'required',
    });
    const ok = validateSignUp(
      form({ role: 'parent', email: 'p@example.com', password: 'password1', username: 'x' }),
    );
    expect(ok.input).toEqual({ role: 'parent', email: 'p@example.com', password: 'password1' });
  });

  it('never trusts a role the form invents', () => {
    const out = validateSignUp(
      form({ role: 'admin', username: 'bluefox42', password: 'password1' }),
    );
    expect(out.input?.role).toBe('student');
  });

  it('validates change password', () => {
    expect(validateChangePassword(form({})).state?.fields).toEqual({
      currentPassword: 'required',
      password: 'required',
    });
    expect(
      validateChangePassword(form({ currentPassword: 'old', password: 'newpassword' })).input,
    ).toEqual({ currentPassword: 'old', newPassword: 'newpassword' });
  });
});
