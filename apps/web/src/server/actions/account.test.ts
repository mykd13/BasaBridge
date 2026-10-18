import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  signInEmail: vi.fn(),
  signInUsername: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
};
const signUpStudent = vi.fn();
const signUpParent = vi.fn();
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/server/auth', () => ({
  AUTH_CODES: { noEmail: 'NO_EMAIL', accountLocked: 'ACCOUNT_LOCKED' },
  getAuth: () => ({ api }),
  signUpStudent,
  signUpParent,
}));

const {
  signInAction,
  signUpAction,
  requestResetAction,
  resetPasswordAction,
  changePasswordAction,
} = await import('./account');

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signInAction', () => {
  it('uses the username route for a username and sends a student home', async () => {
    api.signInUsername.mockResolvedValue({ user: { role: 'student' } });
    await expect(
      signInAction({}, form({ identifier: 'bluefox42', password: 'password1' })),
    ).rejects.toThrow('REDIRECT:/home');
    expect(api.signInUsername).toHaveBeenCalledWith({
      body: { username: 'bluefox42', password: 'password1' },
    });
    expect(api.signInEmail).not.toHaveBeenCalled();
  });

  it('uses the email route for an email and sends a parent to the parent area', async () => {
    api.signInEmail.mockResolvedValue({ user: { role: 'parent' } });
    await expect(
      signInAction({}, form({ identifier: 'p@example.com', password: 'password1' })),
    ).rejects.toThrow('REDIRECT:/parent');
  });

  it('answers a wrong password with one message', async () => {
    api.signInUsername.mockRejectedValue(
      new APIError('UNAUTHORIZED', { code: 'INVALID_USERNAME_OR_PASSWORD' }),
    );
    expect(await signInAction({}, form({ identifier: 'bluefox42', password: 'nope' }))).toEqual({
      error: 'invalidLogin',
    });
  });

  it('reports a locked account with the wait time', async () => {
    api.signInUsername.mockRejectedValue(
      new APIError('TOO_MANY_REQUESTS', { code: 'ACCOUNT_LOCKED', retryAfterMinutes: 15 }),
    );
    expect(await signInAction({}, form({ identifier: 'bluefox42', password: 'x' }))).toEqual({
      error: 'locked',
      retryAfterMinutes: 15,
    });
  });

  it('does not call auth when a field is empty', async () => {
    const out = await signInAction({}, form({ identifier: '', password: '' }));
    expect(out.fields).toBeDefined();
    expect(api.signInUsername).not.toHaveBeenCalled();
  });

  it('turns an unexpected failure into the generic error', async () => {
    api.signInUsername.mockRejectedValue(new Error('db down'));
    expect(await signInAction({}, form({ identifier: 'bluefox42', password: 'x' }))).toEqual({
      error: 'generic',
    });
  });
});

describe('signUpAction', () => {
  it('creates a student and sends them home', async () => {
    signUpStudent.mockResolvedValue({ userId: 'u', notice: 'NO_EMAIL' });
    await expect(
      signUpAction({}, form({ role: 'student', username: 'bluefox42', password: 'password1' })),
    ).rejects.toThrow('REDIRECT:/home');
    expect(signUpStudent).toHaveBeenCalledWith({
      username: 'bluefox42',
      password: 'password1',
      email: undefined,
    });
  });

  it('creates a parent', async () => {
    signUpParent.mockResolvedValue({ userId: 'u', notice: null });
    await expect(
      signUpAction({}, form({ role: 'parent', email: 'p@example.com', password: 'password1' })),
    ).rejects.toThrow('REDIRECT:/parent');
    expect(signUpParent).toHaveBeenCalledWith({ email: 'p@example.com', password: 'password1' });
  });

  it('says when a username is taken', async () => {
    signUpStudent.mockRejectedValue(
      new APIError('UNPROCESSABLE_ENTITY', {
        code: 'USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER_ONE',
      }),
    );
    const out = await signUpAction(
      {},
      form({ role: 'student', username: 'bluefox42', password: 'password1' }),
    );
    expect(out.fields).toEqual({ username: 'usernameTaken' });
  });

  it('gives a taken email the same answer as any other failure', async () => {
    signUpParent.mockRejectedValue(
      new APIError('UNPROCESSABLE_ENTITY', { code: 'USER_ALREADY_EXISTS' }),
    );
    const out = await signUpAction(
      {},
      form({ role: 'parent', email: 'p@example.com', password: 'password1' }),
    );
    expect(out).toEqual({ error: 'signUpFailed' });
  });

  it('rejects bad input before calling the server', async () => {
    const out = await signUpAction({}, form({ role: 'student', username: 'a', password: 'x' }));
    expect(out.fields?.username).toBe('usernameLength');
    expect(signUpStudent).not.toHaveBeenCalled();
  });
});

describe('password actions', () => {
  it('answers a reset request the same way whether or not it worked', async () => {
    api.requestPasswordReset.mockResolvedValue({});
    const known = await requestResetAction({}, form({ email: 'p@example.com' }));
    api.requestPasswordReset.mockRejectedValue(new Error('unknown'));
    const unknown = await requestResetAction({}, form({ email: 'q@example.com' }));
    expect(known).toEqual({ notice: 'resetSent' });
    expect(unknown).toEqual(known);
  });

  it('validates the email on a reset request', async () => {
    expect((await requestResetAction({}, form({ email: 'bad' }))).fields).toEqual({
      email: 'emailInvalid',
    });
  });

  it('resets a password with a token', async () => {
    api.resetPassword.mockResolvedValue({});
    expect(await resetPasswordAction({}, form({ token: 't', password: 'password1' }))).toEqual({
      notice: 'passwordReset',
    });
    api.resetPassword.mockRejectedValue(new Error('expired'));
    expect(await resetPasswordAction({}, form({ token: 't', password: 'password1' }))).toEqual({
      error: 'generic',
    });
  });

  it('changes a password and flags a wrong current password', async () => {
    api.changePassword.mockResolvedValue({});
    const data = form({ currentPassword: 'old', password: 'newpassword' });
    expect(await changePasswordAction({}, data)).toEqual({ notice: 'passwordChanged' });
    api.changePassword.mockRejectedValue(new APIError('BAD_REQUEST', { code: 'INVALID_PASSWORD' }));
    expect((await changePasswordAction({}, data)).fields).toEqual({
      currentPassword: 'passwordWrong',
    });
  });
});
