'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  type FormState,
  text,
  validateChangePassword,
  validateSignIn,
  validateSignUp,
  looksLikeEmail,
  checkPassword,
} from '@/lib/account-forms';
import { AUTH_CODES, getAuth, signUpParent, signUpStudent } from '@/server/auth';

/**
 * Form actions for the account screens (BB-12). They validate on the server and return catalog
 * keys, never text. Nothing here logs a username, an email or a password. The server, not the
 * browser, decides what is allowed.
 */

const HOME: Record<'student' | 'parent', string> = { student: '/home', parent: '/parent' };

interface ApiFailure {
  status?: string | number;
  body?: { code?: string; retryAfterMinutes?: number };
}

const failureOf = (err: unknown): ApiFailure | null =>
  err instanceof APIError ? (err as unknown as ApiFailure) : null;

export async function signInAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { input, state } = validateSignIn(data);
  if (state) return state;
  let role: 'student' | 'parent';
  try {
    const api = getAuth().api;
    const res = looksLikeEmail(input.identifier)
      ? await api.signInEmail({ body: { email: input.identifier, password: input.password } })
      : await api.signInUsername({
          body: { username: input.identifier, password: input.password },
        });
    role = (res.user as { role?: string }).role === 'parent' ? 'parent' : 'student';
  } catch (err) {
    const failure = failureOf(err);
    if (failure?.body?.code === AUTH_CODES.accountLocked) {
      return { error: 'locked', retryAfterMinutes: failure.body.retryAfterMinutes };
    }
    // The same message for a wrong password and an unknown account, so it reveals neither.
    if (failure && String(failure.status).match(/BAD_REQUEST|UNAUTHORIZED|401|400/)) {
      return { error: 'invalidLogin' };
    }
    return { error: 'generic' };
  }
  redirect(HOME[role]);
}

export async function signUpAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { input, state } = validateSignUp(data);
  if (state || !input) return state ?? { error: 'generic' };
  try {
    if (input.role === 'parent') {
      await signUpParent({ email: input.email, password: input.password });
    } else {
      // A student without an email is told on My account that reset will not work.
      await signUpStudent({
        username: input.username,
        password: input.password,
        email: input.email,
      });
    }
  } catch (err) {
    const code = failureOf(err)?.body?.code ?? '';
    if (/USERNAME/.test(code) && /TAKEN|EXISTS/.test(code)) {
      return { fields: { username: 'usernameTaken' } };
    }
    // A taken email gets the same answer as any other failure, so it cannot be probed.
    return { error: 'signUpFailed' };
  }
  redirect(HOME[input.role]);
}

export async function requestResetAction(_prev: FormState, data: FormData): Promise<FormState> {
  const email = text(data, 'email');
  if (!email) return { fields: { email: 'required' } };
  if (!looksLikeEmail(email)) return { fields: { email: 'emailInvalid' } };
  try {
    await getAuth().api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } });
  } catch (err) {
    if (failureOf(err)?.status === 'TOO_MANY_REQUESTS') return { error: 'generic' };
  }
  // Same answer for a known email, an unknown email and a student with no email.
  return { notice: 'resetSent' };
}

export async function resetPasswordAction(_prev: FormState, data: FormData): Promise<FormState> {
  const token = text(data, 'token');
  const password = String(data.get('password') ?? '');
  const problem = checkPassword(password);
  if (problem) return { fields: { password: problem } };
  if (!token) return { error: 'generic' };
  try {
    await getAuth().api.resetPassword({ body: { newPassword: password, token } });
  } catch {
    return { error: 'generic' };
  }
  return { notice: 'passwordReset' };
}

export async function changePasswordAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { input, state } = validateChangePassword(data);
  if (state || !input) return state ?? { error: 'generic' };
  try {
    await getAuth().api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
    });
  } catch (err) {
    const status = failureOf(err)?.status;
    if (String(status).match(/BAD_REQUEST|400/))
      return { fields: { currentPassword: 'passwordWrong' } };
    return { error: 'generic' };
  }
  return { notice: 'passwordChanged' };
}
