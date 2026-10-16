import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '@basabridge/db/schema';
import { signUpParent, signUpStudent } from './accounts';
import { authConfig, NO_EMAIL_NOTICE } from './config';
import { createAuth } from './create-auth';
import type { Db } from './lockout';
import type { Mailer } from './mailer';

const migrations = join(__dirname, '../../../../../packages/db/migrations');

async function setup(opts: { rateLimit?: boolean } = {}) {
  const client = new PGlite();
  for (const file of readdirSync(migrations)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(join(migrations, file), 'utf8');
    for (const stmt of sql.split('--> statement-breakpoint')) await client.exec(stmt);
  }
  const db = drizzle(client, { schema }) as unknown as Db;
  const sent: { to: string; url: string }[] = [];
  const mailer: Mailer = { sendPasswordReset: async (m) => void sent.push(m) };
  const auth = createAuth({
    db,
    secret: 'test-secret-test-secret-test-secret-1234',
    baseURL: 'http://localhost:3000',
    mailer,
    rateLimit: opts.rateLimit ?? false,
  });
  return { db, auth, sent };
}

const signIn = (auth: ReturnType<typeof createAuth>, username: string, password: string) =>
  auth.api.signInUsername({ body: { username, password }, returnHeaders: true });

const tokenFrom = (url: string) => new URL(url).pathname.split('/').pop()!;

describe('sign-up', () => {
  let t: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    t = await setup();
  });

  it('creates a student with a username only and warns that reset will not work', async () => {
    const r = await signUpStudent(t.auth, t.db, { username: 'Mika', password: 'correct horse' });
    expect(r.notice).toBe(NO_EMAIL_NOTICE);
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    expect(u?.role).toBe('student');
    expect(u?.emailReal).toBe(false);
    expect(u?.email.endsWith(authConfig.noEmailDomain)).toBe(true);
    const learner = await t.db
      .select()
      .from(schema.learners)
      .where(eq(schema.learners.userId, r.userId));
    expect(learner).toHaveLength(1);
  });

  it('creates a student with an email and gives no warning', async () => {
    const r = await signUpStudent(t.auth, t.db, {
      username: 'Mika',
      password: 'correct horse',
      email: 'Mika@Example.com',
    });
    expect(r.notice).toBeNull();
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    expect(u?.email).toBe('mika@example.com');
    expect(u?.emailReal).toBe(true);
  });

  it('creates a parent with an email', async () => {
    const r = await signUpParent(t.auth, {
      email: 'Parent@Example.com',
      password: 'correct horse',
    });
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    expect(u?.role).toBe('parent');
    expect(u?.emailReal).toBe(true);
  });

  it('rejects a duplicate username and a short password', async () => {
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    await expect(
      signUpStudent(t.auth, t.db, { username: 'MIKA', password: 'correct horse' }),
    ).rejects.toThrow();
    await expect(
      signUpStudent(t.auth, t.db, { username: 'sam', password: 'short' }),
    ).rejects.toThrow();
  });

  it('stores a hash, never the password', async () => {
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    const [a] = await t.db.select().from(schema.accounts);
    expect(a?.password).toBeTruthy();
    expect(a?.password).not.toContain('correct horse');
  });

  it('does not allow sign-up through the public route', async () => {
    const res = await t.auth.handler(
      new Request('http://localhost:3000/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'x@example.com',
          password: 'correct horse',
          name: 'x',
          role: 'parent',
        }),
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await t.db.select().from(schema.users)).toHaveLength(0);
  });
});

describe('sign-in, sessions and sign-out', () => {
  let t: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    await signUpParent(t.auth, { email: 'parent@example.com', password: 'another phrase' });
  });

  it('signs a student in by username and sets a cookie session', async () => {
    const { headers, response } = await signIn(t.auth, 'Mika', 'correct horse');
    expect(response.user.id).toBeTruthy();
    const cookie = headers.get('set-cookie') ?? '';
    expect(cookie).toContain('session_token');
    expect(cookie.toLowerCase()).toContain('httponly');
    const session = await t.auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.id).toBe(response.user.id);
  });

  it('signs a parent in by email', async () => {
    const r = await t.auth.api.signInEmail({
      body: { email: 'parent@example.com', password: 'another phrase' },
    });
    expect(r.user.id).toBeTruthy();
  });

  it('refuses a wrong password', async () => {
    await expect(signIn(t.auth, 'mika', 'wrong password')).rejects.toThrow();
  });

  it('ends the session on sign-out', async () => {
    const { headers } = await signIn(t.auth, 'mika', 'correct horse');
    const cookie = (headers.get('set-cookie') ?? '').split(';')[0]!;
    const h = new Headers({ cookie });
    expect(await t.auth.api.getSession({ headers: h })).not.toBeNull();
    const before = (await t.db.select().from(schema.sessions)).length;
    await t.auth.api.signOut({ headers: h });
    expect(await t.auth.api.getSession({ headers: h })).toBeNull();
    expect(await t.db.select().from(schema.sessions)).toHaveLength(before - 1);
  });

  it('ignores an expired session', async () => {
    const { headers } = await signIn(t.auth, 'mika', 'correct horse');
    const cookie = (headers.get('set-cookie') ?? '').split(';')[0]!;
    await t.db.update(schema.sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await t.auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
  });
});

describe('lockout and rate limit', () => {
  it('locks a username after repeated failures, even with the right password', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    for (let i = 0; i < authConfig.lockoutMaxFailures; i++) {
      await expect(signIn(t.auth, 'mika', 'nope nope nope')).rejects.toThrow();
    }
    await expect(signIn(t.auth, 'mika', 'correct horse')).rejects.toMatchObject({
      status: 'TOO_MANY_REQUESTS',
    });
  });

  it('lets the person in again once the window has passed', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    for (let i = 0; i < authConfig.lockoutMaxFailures; i++) {
      await expect(signIn(t.auth, 'mika', 'nope nope nope')).rejects.toThrow();
    }
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + (authConfig.lockoutWindowMinutes + 1) * 60_000);
    try {
      const { response } = await signIn(t.auth, 'mika', 'correct horse');
      expect(response.user.id).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a good sign-in clears earlier failures', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    for (let i = 0; i < authConfig.lockoutMaxFailures - 1; i++) {
      await expect(signIn(t.auth, 'mika', 'nope nope nope')).rejects.toThrow();
    }
    await signIn(t.auth, 'mika', 'correct horse');
    expect(await t.db.select().from(schema.signInFailures)).toHaveLength(0);
  });

  it('limits sign-in requests per address', async () => {
    const t = await setup({ rateLimit: true });
    const attempt = () =>
      t.auth.handler(
        new Request('http://localhost:3000/api/auth/sign-in/username', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
          body: JSON.stringify({ username: `user${Math.random()}`, password: 'whatever it is' }),
        }),
      );
    let last = 0;
    for (let i = 0; i < authConfig.signInPerMinute + 2; i++) last = (await attempt()).status;
    expect(last).toBe(429);
  });
});

describe('password reset', () => {
  let t: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    t = await setup();
  });

  it('emails a link to an account with a real email and resets the password once', async () => {
    await signUpParent(t.auth, { email: 'parent@example.com', password: 'old password' });
    await t.auth.api.requestPasswordReset({ body: { email: 'parent@example.com' } });
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]?.to).toBe('parent@example.com');
    const token = tokenFrom(t.sent[0]!.url.split('?')[0]!);
    await t.auth.api.resetPassword({ body: { newPassword: 'new password', token } });
    await expect(
      t.auth.api.signInEmail({ body: { email: 'parent@example.com', password: 'old password' } }),
    ).rejects.toThrow();
    const ok = await t.auth.api.signInEmail({
      body: { email: 'parent@example.com', password: 'new password' },
    });
    expect(ok.user.id).toBeTruthy();
    await expect(
      t.auth.api.resetPassword({ body: { newPassword: 'third password', token } }),
    ).rejects.toThrow();
  });

  it('rejects an expired reset link', async () => {
    await signUpParent(t.auth, { email: 'parent@example.com', password: 'old password' });
    await t.auth.api.requestPasswordReset({ body: { email: 'parent@example.com' } });
    const token = tokenFrom(t.sent[0]!.url.split('?')[0]!);
    await t.db.update(schema.verifications).set({ expiresAt: new Date(Date.now() - 1000) });
    await expect(
      t.auth.api.resetPassword({ body: { newPassword: 'new password', token } }),
    ).rejects.toThrow();
  });

  it('works for a student who gave an email', async () => {
    await signUpStudent(t.auth, t.db, {
      username: 'mika',
      password: 'old password',
      email: 'mika@example.com',
    });
    await t.auth.api.requestPasswordReset({ body: { email: 'mika@example.com' } });
    expect(t.sent).toHaveLength(1);
  });

  it('sends nothing to a student who skipped email', async () => {
    const r = await signUpStudent(t.auth, t.db, { username: 'mika', password: 'old password' });
    expect(r.notice).toBe(NO_EMAIL_NOTICE);
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    await t.auth.api.requestPasswordReset({ body: { email: u!.email } });
    expect(t.sent).toHaveLength(0);
  });

  it('revokes other sessions after a reset', async () => {
    await signUpParent(t.auth, { email: 'parent@example.com', password: 'old password' });
    await t.auth.api.signInEmail({
      body: { email: 'parent@example.com', password: 'old password' },
    });
    await t.auth.api.requestPasswordReset({ body: { email: 'parent@example.com' } });
    const token = tokenFrom(t.sent[0]!.url.split('?')[0]!);
    await t.auth.api.resetPassword({ body: { newPassword: 'new password', token } });
    expect(await t.db.select().from(schema.sessions)).toHaveLength(0);
  });
});
