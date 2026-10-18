import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '@basabridge/db/schema';
import { signUpParent, signUpStudent } from './accounts';
import { authConfig, AUTH_CODES } from './config';
import { createAuth } from './create-auth';
import type { Db } from './lockout';
import { unconfiguredMailer, type Mailer } from './mailer';

const migrations = join(__dirname, '../../../../../packages/db/migrations');

/** One in-memory Postgres for the whole file. Starting one per test is slow on small machines. */
let shared: Promise<PGlite> | undefined;
function database() {
  shared ??= (async () => {
    const client = new PGlite();
    for (const file of readdirSync(migrations)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const sql = readFileSync(join(migrations, file), 'utf8');
      for (const stmt of sql.split('--> statement-breakpoint')) await client.exec(stmt);
    }
    return client;
  })();
  return shared;
}

async function setup(opts: { rateLimit?: boolean } = {}) {
  const client = await database();
  // Every other table cascades from users.
  await client.exec(
    'TRUNCATE users, verifications, rate_limits, sign_in_failures RESTART IDENTITY CASCADE',
  );
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
    expect(r.notice).toBe(AUTH_CODES.noEmail);
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
    const r = await signUpParent(t.auth, t.db, {
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
    await signUpParent(t.auth, t.db, { email: 'parent@example.com', password: 'another phrase' });
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

describe('migrations on a database that already has users', () => {
  it('backfills name and email so the new constraints hold', async () => {
    const client = new PGlite();
    const files = readdirSync(migrations)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const run = async (file: string) => {
      const sql = readFileSync(join(migrations, file), 'utf8');
      for (const stmt of sql.split('--> statement-breakpoint')) await client.exec(stmt);
    };
    await run(files[0]!);
    await client.exec(
      `INSERT INTO users (role, username, password_hash) VALUES ('student', 'old_user', 'x')`,
    );
    for (const file of files.slice(1)) await run(file);
    const { rows } = await client.query<{ name: string; email: string }>(
      'SELECT name, email FROM users',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('old_user');
    expect(rows[0]!.email).toMatch(/@students\.basabridge\.invalid$/);
  });
});

describe('lockout and rate limit', () => {
  it('stores a fixed size hash for an unknown, very long identifier', async () => {
    const t = await setup();
    const long = 'x'.repeat(5000);
    await expect(signIn(t.auth, long, 'nope nope nope')).rejects.toThrow();
    const rows = await t.db.select().from(schema.signInFailures);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.identifier).toMatch(/^name:[0-9a-f]{64}$/);
  });

  it('locks a username after repeated failures, even with the right password', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    for (let i = 0; i < authConfig.lockoutMaxFailures; i++) {
      await expect(signIn(t.auth, 'mika', 'nope nope nope')).rejects.toThrow();
    }
    await expect(signIn(t.auth, 'mika', 'correct horse')).rejects.toMatchObject({
      status: 'TOO_MANY_REQUESTS',
      body: { code: AUTH_CODES.accountLocked, retryAfterMinutes: authConfig.lockoutWindowMinutes },
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
    await signUpParent(t.auth, t.db, { email: 'parent@example.com', password: 'old password' });
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
    await signUpParent(t.auth, t.db, { email: 'parent@example.com', password: 'old password' });
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
    expect(r.notice).toBe(AUTH_CODES.noEmail);
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    await t.auth.api.requestPasswordReset({ body: { email: u!.email } });
    expect(t.sent).toHaveLength(0);
  });

  it('revokes other sessions after a reset', async () => {
    await signUpParent(t.auth, t.db, { email: 'parent@example.com', password: 'old password' });
    await t.auth.api.signInEmail({
      body: { email: 'parent@example.com', password: 'old password' },
    });
    await t.auth.api.requestPasswordReset({ body: { email: 'parent@example.com' } });
    const token = tokenFrom(t.sent[0]!.url.split('?')[0]!);
    await t.auth.api.resetPassword({ body: { newPassword: 'new password', token } });
    expect(await t.db.select().from(schema.sessions)).toHaveLength(0);
  });
});

const post = (t: Awaited<ReturnType<typeof setup>>, path: string, body: unknown, cookie?: string) =>
  t.auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

describe('review fixes', () => {
  it('B1: a student cannot change role, age band or email flag through /update-user', async () => {
    const t = await setup();
    const r = await signUpStudent(t.auth, t.db, { username: 'mika', password: 'correct horse' });
    await t.db
      .update(schema.users)
      .set({ ageBand: 'under13' })
      .where(eq(schema.users.id, r.userId));
    const { headers } = await signIn(t.auth, 'mika', 'correct horse');
    const cookie = (headers.get('set-cookie') ?? '').split(';')[0]!;
    await post(t, '/update-user', { role: 'parent', ageBand: '18plus', emailReal: true }, cookie);
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    expect(u?.role).toBe('student');
    expect(u?.ageBand).toBe('under13');
    expect(u?.emailReal).toBe(false);
  });

  it('B2: an extra username field does not dodge the email lockout', async () => {
    const t = await setup();
    await signUpParent(t.auth, t.db, { email: 'parent@example.com', password: 'right password' });
    for (let i = 0; i < authConfig.lockoutMaxFailures; i++) {
      await post(t, '/sign-in/email', {
        email: 'parent@example.com',
        password: 'wrong password',
        username: `made-up-${i}`,
      });
    }
    const res = await post(t, '/sign-in/email', {
      email: 'parent@example.com',
      password: 'right password',
      username: 'another-one',
    });
    expect(res.status).toBe(429);
  });

  it('B2: both sign-in routes share one counter for a student', async () => {
    const t = await setup();
    const r = await signUpStudent(t.auth, t.db, { username: 'mika', password: 'right password' });
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    for (let i = 0; i < 3; i++) {
      await post(t, '/sign-in/username', { username: 'mika', password: 'wrong password' });
    }
    for (let i = 0; i < 2; i++) {
      await post(t, '/sign-in/email', { email: u!.email, password: 'wrong password' });
    }
    const res = await post(t, '/sign-in/username', {
      username: 'mika',
      password: 'right password',
    });
    expect(res.status).toBe(429);
  });

  it('S1: a parallel burst of wrong passwords is stopped', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'right password' });
    const results = await Promise.all(
      Array.from({ length: 30 }, () =>
        post(t, '/sign-in/username', { username: 'mika', password: 'wrong password' }),
      ),
    );
    const locked = results.filter((r) => r.status === 429).length;
    expect(locked).toBeGreaterThanOrEqual(30 - authConfig.lockoutMaxFailures);
  });

  it('S3: odd usernames sign up without email, and nobody can register the reserved domain', async () => {
    const t = await setup();
    const a = await signUpStudent(t.auth, t.db, { username: 'a..b', password: 'correct horse' });
    expect(a.notice).toBe(AUTH_CODES.noEmail);
    await signUpStudent(t.auth, t.db, { username: 'zed', password: 'correct horse' });
    await expect(
      signUpParent(t.auth, t.db, {
        email: `zed@${authConfig.noEmailDomain}`,
        password: 'correct horse',
      }),
    ).rejects.toThrow();
    await expect(
      signUpStudent(t.auth, t.db, {
        username: 'kai',
        password: 'correct horse',
        email: `kai@${authConfig.noEmailDomain}`,
      }),
    ).rejects.toThrow();
  });

  it('S5: bad input is rejected before any account is made', async () => {
    const t = await setup();
    await expect(
      signUpParent(t.auth, t.db, { email: 'not an email', password: 'correct horse' }),
    ).rejects.toThrow();
    await expect(
      signUpStudent(t.auth, t.db, { username: 'ab', password: 'correct horse' }),
    ).rejects.toThrow();
    expect(await t.db.select().from(schema.users)).toHaveLength(0);
  });

  it('S5: a failed learner row removes the half-made user', async () => {
    const t = await setup();
    const failing = new Proxy(t.db, {
      get(target, prop) {
        if (prop === 'insert') {
          return () => {
            throw new Error('boom');
          };
        }
        const v = Reflect.get(target, prop) as unknown;
        return typeof v === 'function' ? v.bind(target) : v;
      },
    });
    await expect(
      signUpStudent(t.auth, failing, { username: 'mika', password: 'correct horse' }),
    ).rejects.toThrow('boom');
    expect(await t.db.select().from(schema.users)).toHaveLength(0);
  });

  it('N1: no email or username is stored as a name for parents', async () => {
    const t = await setup();
    const r = await signUpParent(t.auth, t.db, {
      email: 'parent@example.com',
      password: 'correct horse',
    });
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    expect(u?.name).not.toContain('@');
  });
});

describe('second review fixes', () => {
  it('B1: retrying while locked does not extend the lock', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'right password' });
    for (let i = 0; i < authConfig.lockoutMaxFailures; i++) {
      await post(t, '/sign-in/username', { username: 'mika', password: 'wrong password' });
    }
    for (let i = 0; i < 3; i++) {
      const res = await post(t, '/sign-in/username', { username: 'mika', password: 'wrong' });
      expect(res.status).toBe(429);
    }
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + (authConfig.lockoutWindowMinutes + 1) * 60_000);
    try {
      const res = await post(t, '/sign-in/username', {
        username: 'mika',
        password: 'right password',
      });
      expect(res.status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it('W1: reset answers the same for a known email, an unknown email and a no-email student', async () => {
    const t = await setup();
    await signUpParent(t.auth, t.db, { email: 'parent@example.com', password: 'right password' });
    const s = await signUpStudent(t.auth, t.db, { username: 'mika', password: 'right password' });
    const [stu] = await t.db.select().from(schema.users).where(eq(schema.users.id, s.userId));
    const answers = [];
    for (const email of ['parent@example.com', 'nobody@example.com', stu!.email]) {
      const res = await post(t, '/request-password-reset', { email });
      answers.push({ status: res.status, body: await res.json() });
    }
    expect(answers[1]).toEqual(answers[0]);
    expect(answers[2]).toEqual(answers[0]);
  });

  it('W1: a failing mailer does not change the reset response', async () => {
    const t = await setup();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = createAuth({
      db: t.db,
      secret: 'test-secret-test-secret-test-secret-1234',
      baseURL: 'http://localhost:3000',
      mailer: unconfiguredMailer,
      rateLimit: false,
    });
    await signUpParent(failing, t.db, { email: 'parent@example.com', password: 'right password' });
    const res = await failing.handler(
      new Request('http://localhost:3000/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        body: JSON.stringify({ email: 'parent@example.com' }),
      }),
    );
    expect(res.status).toBe(200);
    spy.mockRestore();
  });

  it('W3: reset requests and password changes are rate limited', async () => {
    const t = await setup({ rateLimit: true });
    const hit = (path: string) =>
      t.auth.handler(
        new Request(`http://localhost:3000/api/auth${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
            'x-forwarded-for': '203.0.113.7',
          },
          body: JSON.stringify({
            email: 'x@example.com',
            newPassword: 'whatever it is',
            token: 'x',
          }),
        }),
      );
    for (const [path, limit] of [
      ['/request-password-reset', authConfig.resetRequestsPerHour],
      ['/reset-password', authConfig.resetRequestsPerHour],
    ] as const) {
      let last = 0;
      for (let i = 0; i < limit + 2; i++) last = (await hit(path)).status;
      expect(last).toBe(429);
    }
  });

  it('W4: a student cannot store a real name or image through /update-user', async () => {
    const t = await setup();
    const r = await signUpStudent(t.auth, t.db, { username: 'mika', password: 'right password' });
    const { headers } = await signIn(t.auth, 'mika', 'right password');
    const cookie = (headers.get('set-cookie') ?? '').split(';')[0]!;
    const res = await post(t, '/update-user', { name: 'Maria Santos' }, cookie);
    expect(res.status).toBe(400);
    const res2 = await post(t, '/update-user', { image: 'http://x/y.png' }, cookie);
    expect(res2.status).toBe(400);
    const [u] = await t.db.select().from(schema.users).where(eq(schema.users.id, r.userId));
    expect(u?.name).toBe('mika');
    expect(u?.image).toBeNull();
  });

  it('W5: refusals carry codes, never English text', async () => {
    const t = await setup();
    await expect(
      signUpParent(t.auth, t.db, {
        email: `a@${authConfig.noEmailDomain}`,
        password: 'right password',
      }),
    ).rejects.toThrow(AUTH_CODES.emailNotAllowed);
  });

  it('W7: a request from another origin is refused', async () => {
    const t = await setup();
    await signUpStudent(t.auth, t.db, { username: 'mika', password: 'right password' });
    const { headers } = await signIn(t.auth, 'mika', 'right password');
    const cookie = (headers.get('set-cookie') ?? '').split(';')[0]!;
    // The check applies to requests that carry a session cookie.
    const res = await t.auth.handler(
      new Request('http://localhost:3000/api/auth/sign-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.example', cookie },
        body: '{}',
      }),
    );
    expect(res.status).toBe(403);
    expect(await t.auth.api.getSession({ headers: new Headers({ cookie }) })).not.toBeNull();
  });
});

describe('production mailer', () => {
  it('fails loudly instead of pretending to send', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      unconfiguredMailer.sendPasswordReset({ to: 'a@example.com', url: 'http://x/y' }),
    ).rejects.toThrow('No email provider');
    expect(spy.mock.calls.flat().join(' ')).not.toContain('a@example.com');
    spy.mockRestore();
  });
});
