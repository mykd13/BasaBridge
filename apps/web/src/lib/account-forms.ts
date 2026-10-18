import { authConfig } from '@/server/auth/config';
import { checkUsername, USERNAME_CODES } from '@/server/auth/username-filter';

/** Keys under `account.errors` in the i18n catalog. Server actions return these, never text. */
export type FormErrorKey =
  | 'required'
  | 'usernameLength'
  | 'usernameChars'
  | 'usernameNotAllowed'
  | 'usernameTaken'
  | 'passwordShort'
  | 'passwordLong'
  | 'passwordWrong'
  | 'emailInvalid'
  | 'invalidLogin'
  | 'locked'
  | 'signUpFailed'
  | 'notWired'
  | 'generic';

export type FieldName = 'username' | 'email' | 'password' | 'currentPassword' | 'identifier';

/** What a form action sends back to its form. `notice` is a success message key. */
export interface FormState {
  error?: FormErrorKey;
  fields?: Partial<Record<FieldName, FormErrorKey>>;
  notice?: 'resetSent' | 'passwordChanged' | 'passwordReset' | 'noEmail';
  /** Minutes until a locked account may try again. */
  retryAfterMinutes?: number;
}

export const EMPTY_FORM: FormState = {};

export const text = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
};

/** A simple shape check. The server (Better Auth and zod) is the real judge. */
export const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function checkPassword(password: string): FormErrorKey | null {
  if (!password) return 'required';
  if (password.length < authConfig.minPasswordLength) return 'passwordShort';
  if (password.length > authConfig.maxPasswordLength) return 'passwordLong';
  return null;
}

export function checkUsernameField(username: string): FormErrorKey | null {
  if (!username) return 'required';
  if (
    username.length < authConfig.minUsernameLength ||
    username.length > authConfig.maxUsernameLength
  ) {
    return 'usernameLength';
  }
  const verdict = checkUsername(username);
  if (verdict.ok) return null;
  return verdict.code === USERNAME_CODES.chars ? 'usernameChars' : 'usernameNotAllowed';
}

function onlyErrors(fields: FormState['fields']): FormState['fields'] | undefined {
  const present = Object.entries(fields ?? {}).filter(([, v]) => v);
  return present.length ? (Object.fromEntries(present) as FormState['fields']) : undefined;
}

export interface SignInInput {
  identifier: string;
  password: string;
}

export function validateSignIn(data: FormData): { input: SignInInput; state?: FormState } {
  const input = {
    identifier: text(data, 'identifier'),
    password: String(data.get('password') ?? ''),
  };
  const fields = onlyErrors({
    identifier: input.identifier ? undefined : 'required',
    password: input.password ? undefined : 'required',
  });
  return fields ? { input, state: { fields } } : { input };
}

export type SignUpInput =
  | { role: 'student'; username: string; password: string; email?: string }
  | { role: 'parent'; email: string; password: string };

export function validateSignUp(data: FormData): { input?: SignUpInput; state?: FormState } {
  const password = String(data.get('password') ?? '');
  const email = text(data, 'email');
  const emailError = email && !looksLikeEmail(email) ? 'emailInvalid' : undefined;

  if (text(data, 'role') === 'parent') {
    const fields = onlyErrors({
      email: !email ? 'required' : emailError,
      password: checkPassword(password) ?? undefined,
    });
    return fields ? { state: { fields } } : { input: { role: 'parent', email, password } };
  }

  const username = text(data, 'username');
  const fields = onlyErrors({
    username: checkUsernameField(username) ?? undefined,
    password: checkPassword(password) ?? undefined,
    email: emailError,
  });
  if (fields) return { state: { fields } };
  return { input: { role: 'student', username, password, ...(email ? { email } : {}) } };
}

export function validateChangePassword(data: FormData): {
  input?: { currentPassword: string; newPassword: string };
  state?: FormState;
} {
  const currentPassword = String(data.get('currentPassword') ?? '');
  const newPassword = String(data.get('password') ?? '');
  const fields = onlyErrors({
    currentPassword: currentPassword ? undefined : 'required',
    password: checkPassword(newPassword) ?? undefined,
  });
  return fields ? { state: { fields } } : { input: { currentPassword, newPassword } };
}
