import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { username } from 'better-auth/plugins';
import * as schema from '@basabridge/db/schema';
import { authConfig } from './config';
import { clearFailures, isLockedOut, recordFailure, type Db } from './lockout';
import { consoleMailer, type Mailer } from './mailer';

export interface AuthOptions {
  db: Db;
  secret: string;
  baseURL?: string;
  mailer?: Mailer;
  /** Turn the per address rate limiter off in tests that make many calls. */
  rateLimit?: boolean;
}

const SIGN_IN_PATHS = ['/sign-in/username', '/sign-in/email'];

function identifierFrom(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as { username?: unknown; email?: unknown };
  const raw = typeof b.username === 'string' ? b.username : b.email;
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
      additionalFields: {
        role: { type: 'string', required: true, input: true },
        emailReal: { type: 'boolean', required: false, input: true },
        ageBand: { type: 'string', required: false, input: true },
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
        if (!SIGN_IN_PATHS.includes(ctx.path)) return;
        const id = identifierFrom(ctx.body);
        if (id && (await isLockedOut(db, id))) {
          throw new APIError('TOO_MANY_REQUESTS', {
            message: `Too many tries. Wait ${authConfig.lockoutWindowMinutes} minutes and try again.`,
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (!SIGN_IN_PATHS.includes(ctx.path)) return;
        const id = identifierFrom(ctx.body);
        if (!id) return;
        if (ctx.context.returned instanceof APIError) await recordFailure(db, id);
        else await clearFailures(db, id);
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
