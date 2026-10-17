import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import * as schema from '@basabridge/db/schema';
import { authConfig } from './config';
import { clearAttempts, lockoutKey, registerAttempt, type Db } from './lockout';
import { consoleMailer, type Mailer } from './mailer';

export interface AuthOptions {
  db: Db;
  secret: string;
  baseURL: string;
  mailer?: Mailer;
  /** Turn the per address rate limiter off in tests that make many calls. */
  rateLimit?: boolean;
}

/** Each sign-in route reads its own field. A stray field on the other route is ignored. */
const SIGN_IN_FIELD: Record<string, 'username' | 'email'> = {
  '/sign-in/username': 'username',
  '/sign-in/email': 'email',
};

function identifierFrom(path: string, body: unknown): string | null {
  const field = SIGN_IN_FIELD[path];
  if (!field || !body || typeof body !== 'object') return null;
  const raw = (body as Record<string, unknown>)[field];
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

export function createAuth({
  db,
  secret,
  baseURL,
  mailer = consoleMailer,
  rateLimit = true,
}: AuthOptions) {
  return betterAuth({
    secret,
    baseURL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    advanced: { database: { generateId: 'uuid' } },
    // Accounts are created only by our own server functions (accounts.ts), which set the role.
    disabledPaths: ['/sign-up/email'],
    user: {
      // input: false keeps these out of the public /update-user and sign-up routes. Server code
      // in accounts.ts sets them with a direct database update after sign-up.
      additionalFields: {
        role: { type: 'string', required: false, input: false, defaultValue: 'student' },
        emailReal: { type: 'boolean', required: false, input: false },
        ageBand: { type: 'string', required: false, input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: authConfig.minPasswordLength,
      maxPasswordLength: authConfig.maxPasswordLength,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        // Students without an email have a reserved address that cannot receive mail.
        if (!(user as { emailReal?: boolean }).emailReal) return;
        await mailer.sendPasswordReset({ to: user.email, url });
      },
    },
    session: {
      expiresIn: authConfig.sessionSeconds,
      updateAge: authConfig.sessionRefreshSeconds,
    },
    rateLimit: {
      enabled: rateLimit,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/username': { window: 60, max: authConfig.signInPerMinute },
        '/sign-in/email': { window: 60, max: authConfig.signInPerMinute },
        '/request-password-reset': { window: 3600, max: authConfig.resetRequestsPerHour },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const id = identifierFrom(ctx.path, ctx.body);
        if (!id) return;
        const key = await lockoutKey(db, id);
        if (await registerAttempt(db, key)) {
          // A stable code, not text. The screens map it to catalog strings (BB-12, BB-58).
          throw new APIError('TOO_MANY_REQUESTS', {
            code: 'ACCOUNT_LOCKED',
            message: 'ACCOUNT_LOCKED',
            retryAfterMinutes: authConfig.lockoutWindowMinutes,
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const id = identifierFrom(ctx.path, ctx.body);
        if (!id || ctx.context.returned instanceof APIError) return;
        await clearAttempts(db, await lockoutKey(db, id));
      }),
    },
    plugins: [
      username({
        minUsernameLength: authConfig.minUsernameLength,
        maxUsernameLength: authConfig.maxUsernameLength,
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
