import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCaptureMailer, createResendMailer, emailHashSecret, mailerFromEnv } from './mailer';
import { sendEmail } from './send';
import {
  assertSafeUrl,
  guardianApprovalConfirmed,
  guardianApprovalRequest,
  passwordReset,
  type EmailLanguage,
  type RenderedEmail,
} from './templates';
import {
  handleWebhook,
  suppressionsFrom,
  verifyWebhook,
  WEBHOOK_TOLERANCE_SECONDS,
  type Suppression,
} from './webhook';

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

const langs: EmailLanguage[] = ['en', 'fil'];
const approval = {
  approveUrl: 'https://basabridge.vercel.app/approve?t=abc',
  declineUrl: 'https://basabridge.vercel.app/decline?t=abc',
  expiresInDays: 7,
};
const reset = { resetUrl: 'https://basabridge.vercel.app/reset?t=xyz', expiresInMinutes: 60 };

function all(lang: EmailLanguage): RenderedEmail[] {
  return [
    guardianApprovalRequest(lang, approval),
    guardianApprovalConfirmed(lang),
    passwordReset(lang, reset),
  ];
}

describe('templates', () => {
  it('render every template in English and Filipino, with text and html', () => {
    for (const lang of langs) {
      for (const e of all(lang)) {
        expect(e.subject.length, e.template).toBeGreaterThan(0);
        expect(e.text.length, e.template).toBeGreaterThan(0);
        expect(e.html, e.template).toContain('<!doctype html>');
        expect(e.text + e.html, e.template).not.toMatch(/undefined|NaN|\$\{/);
      }
    }
    expect(guardianApprovalRequest('fil', approval).subject).not.toBe(
      guardianApprovalRequest('en', approval).subject,
    );
  });

  it('put the links in both the text and the html', () => {
    for (const lang of langs) {
      const a = guardianApprovalRequest(lang, approval);
      for (const url of [approval.approveUrl, approval.declineUrl]) {
        expect(a.text).toContain(url);
        expect(a.html).toContain(url);
      }
      const r = passwordReset(lang, reset);
      expect(r.text).toContain(reset.resetUrl);
      expect(r.html).toContain(reset.resetUrl);
    }
  });

  it('refuse a link that is not https', () => {
    expect(() => passwordReset('en', { ...reset, resetUrl: 'http://evil.example/reset' })).toThrow(
      'https',
    );
  });

  it('refuse other schemes even with a localhost host', () => {
    const dev = { NODE_ENV: 'development' };
    expect(() => assertSafeUrl('javascript://localhost/%0aalert(1)', dev)).toThrow('https');
    expect(() => assertSafeUrl('data://localhost/x', dev)).toThrow('https');
    expect(() => assertSafeUrl('file://localhost/etc/passwd', dev)).toThrow('https');
  });

  it('allow http only for localhost outside production', () => {
    expect(assertSafeUrl('http://localhost:3000/x', { NODE_ENV: 'development' })).toBe(
      'http://localhost:3000/x',
    );
    expect(() => assertSafeUrl('http://localhost:3000/x', { NODE_ENV: 'production' })).toThrow(
      'https',
    );
    expect(() => assertSafeUrl('http://127.0.0.1:3000/x', { NODE_ENV: 'development' })).toThrow(
      'https',
    );
    expect(assertSafeUrl('https://basabridge.vercel.app/x', { NODE_ENV: 'production' })).toBe(
      'https://basabridge.vercel.app/x',
    );
  });

  it('say recordings are kept only if the child chooses, in both languages', () => {
    const en = guardianApprovalRequest('en', approval).text + guardianApprovalConfirmed('en').text;
    const fil =
      guardianApprovalRequest('fil', approval).text + guardianApprovalConfirmed('fil').text;
    expect(en).toContain('unless the child chooses to keep');
    expect(fil).toContain('maliban kung piliin ng bata');
  });

  it('escape a link so it cannot inject html', () => {
    const r = passwordReset('en', { ...reset, resetUrl: 'https://a.example/?q="><script>' });
    expect(r.html).not.toContain('<script>');
  });

  it('never carry a name, story text or score, whatever extra data is passed', () => {
    const leaky = {
      ...approval,
      name: 'Maria Santos',
      username: 'maria12',
      storyText: 'The cat sat on the mat.',
      score: '9 of 10',
    };
    const e = guardianApprovalRequest('en', leaky);
    for (const secret of [leaky.name, leaky.username, leaky.storyText, leaky.score]) {
      expect(e.text + e.html + e.subject).not.toContain(secret);
    }
  });
});

describe('mailers', () => {
  it('capture messages instead of sending, and log only the template', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const mailer = createCaptureMailer();
    const email = { ...passwordReset('en', reset), to: 'parent@example.test' };
    await mailer.send(email);
    expect(mailer.sent).toHaveLength(1);
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('password_reset');
    expect(logged).not.toContain('parent@example.test');
    expect(logged).not.toContain(reset.resetUrl);
  });

  it('use capture in development and refuse to run without keys in production', () => {
    expect('sent' in mailerFromEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(true);
    expect(() => mailerFromEnv({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(
      'RESEND_API_KEY',
    );
    const real = mailerFromEnv({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'BasaBridge <hello@example.test>',
    } as NodeJS.ProcessEnv);
    expect('sent' in real).toBe(false);
  });

  it('call the Resend API with the message and a template tag', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }));
    const mailer = createResendMailer({ apiKey: 're_test', from: 'a@example.test', fetchImpl });
    const res = await mailer.send({ ...passwordReset('en', reset), to: 'parent@example.test' });
    expect(res.id).toBe('em_1');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(['parent@example.test']);
    expect(body.tags).toEqual([{ name: 'template', value: 'password_reset' }]);
  });

  it('throw on a provider error without putting the address in the message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 422 }));
    const mailer = createResendMailer({ apiKey: 're_test', from: 'a@example.test', fetchImpl });
    const err = await mailer
      .send({ ...passwordReset('en', reset), to: 'parent@example.test' })
      .catch((e: Error) => e);
    expect(String(err)).toContain('422');
    expect(String(err)).not.toContain('parent@example.test');
  });
});

describe('sendEmail', () => {
  it('sends to a clean address and refuses a suppressed one', async () => {
    const mailer = createCaptureMailer();
    const email = { ...guardianApprovalConfirmed('en'), to: 'ok@example.test' };
    expect(await sendEmail(mailer, async () => undefined, email)).toMatchObject({
      status: 'sent',
    });
    expect(
      await sendEmail(mailer, async () => ({ reason: 'bounce' }), {
        ...email,
        to: 'x@example.test',
      }),
    ).toEqual({ status: 'suppressed', reason: 'bounce' });
    expect(mailer.sent).toHaveLength(1);
  });
});

describe('webhook', () => {
  const secretBytes = Buffer.from('test-webhook-secret-bytes');
  const secret = `whsec_${secretBytes.toString('base64')}`;
  const body = JSON.stringify({ type: 'email.bounced', data: {} });
  const now = 1_800_000_000;
  const sign = (id: string, ts: number, raw: string) =>
    `v1,${createHmac('sha256', secretBytes).update(`${id}.${ts}.${raw}`).digest('base64')}`;

  it('accepts a correct signature, including one among several', () => {
    const sig = sign('msg_1', now, body);
    expect(
      verifyWebhook(secret, { id: 'msg_1', timestamp: String(now), signature: sig }, body, now),
    ).toBe(true);
    const many = `v1,AAAA ${sig}`;
    expect(
      verifyWebhook(secret, { id: 'msg_1', timestamp: String(now), signature: many }, body, now),
    ).toBe(true);
  });

  it('refuses a changed body, a wrong secret, missing headers and an old timestamp', () => {
    const sig = sign('msg_1', now, body);
    const h = { id: 'msg_1', timestamp: String(now), signature: sig };
    expect(verifyWebhook(secret, h, body + ' ', now)).toBe(false);
    expect(verifyWebhook(`whsec_${Buffer.from('other').toString('base64')}`, h, body, now)).toBe(
      false,
    );
    expect(verifyWebhook(secret, { ...h, signature: null }, body, now)).toBe(false);
    const late = now + WEBHOOK_TOLERANCE_SECONDS + 1;
    expect(verifyWebhook(secret, h, body, late)).toBe(false);
  });

  it('suppresses permanent bounces and complaints only', () => {
    const data = { email_id: 'em_1', to: ['a@example.test'] };
    expect(
      suppressionsFrom({ type: 'email.bounced', data: { ...data, bounce: { type: 'Permanent' } } }),
    ).toEqual([{ address: 'a@example.test', reason: 'bounce', providerEmailId: 'em_1' }]);
    expect(
      suppressionsFrom({ type: 'email.bounced', data: { ...data, bounce: { type: 'Transient' } } }),
    ).toEqual([]);
    expect(suppressionsFrom({ type: 'email.complained', data })).toEqual([
      { address: 'a@example.test', reason: 'complaint', providerEmailId: 'em_1' },
    ]);
    expect(suppressionsFrom({ type: 'email.delivered', data })).toEqual([]);
    expect(suppressionsFrom('nonsense')).toEqual([]);
  });
});

describe('email hash secret', () => {
  it('uses EMAIL_HASH_SECRET when set and refuses to run without it in production', () => {
    expect(emailHashSecret({ EMAIL_HASH_SECRET: 'k' })).toBe('k');
    expect(() => emailHashSecret({ NODE_ENV: 'production' })).toThrow('EMAIL_HASH_SECRET');
    expect(emailHashSecret({ NODE_ENV: 'development' }).length).toBeGreaterThan(0);
  });
});

describe('Resend timeout', () => {
  it('passes an abort signal, so a hung provider fails instead of hanging', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const mailer = createResendMailer({
      apiKey: 're_test',
      from: 'a@example.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 20,
    });
    await expect(
      mailer.send({ ...passwordReset('en', reset), to: 'parent@example.test' }),
    ).rejects.toThrow('aborted');
  });
});

describe('webhook route logic', () => {
  const secretBytes = Buffer.from('route-test-secret');
  const webhookSecret = `whsec_${secretBytes.toString('base64')}`;

  function signedRequest(body: string, id = 'msg_1', ts = Math.floor(Date.now() / 1000)) {
    const sig = createHmac('sha256', secretBytes).update(`${id}.${ts}.${body}`).digest('base64');
    return new Request('https://example.test/api/email/webhook', {
      method: 'POST',
      body,
      headers: { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` },
    });
  }

  it('answers 503 when the webhook is not set up', async () => {
    const res = await handleWebhook(signedRequest('{}'), {
      webhookSecret: undefined,
      record: vi.fn(),
    });
    expect(res.status).toBe(503);
  });

  it('answers 401 on a bad signature and stores nothing', async () => {
    const record = vi.fn();
    const req = new Request('https://example.test/api/email/webhook', {
      method: 'POST',
      body: '{}',
      headers: { 'svix-id': 'm', 'svix-timestamp': '1', 'svix-signature': 'v1,AAAA' },
    });
    const res = await handleWebhook(req, { webhookSecret, record });
    expect(res.status).toBe(401);
    expect(record).not.toHaveBeenCalled();
  });

  it('answers 400 on a signed body that is not JSON', async () => {
    const res = await handleWebhook(signedRequest('not json'), { webhookSecret, record: vi.fn() });
    expect(res.status).toBe(400);
  });

  it('stores a permanent bounce and answers 204', async () => {
    const stored: Suppression[] = [];
    const body = JSON.stringify({
      type: 'email.bounced',
      data: { email_id: 'em_9', to: ['gone@example.test'], bounce: { type: 'Permanent' } },
    });
    const res = await handleWebhook(signedRequest(body), {
      webhookSecret,
      record: async (s) => void stored.push(s),
    });
    expect(res.status).toBe(204);
    expect(stored).toEqual([
      { address: 'gone@example.test', reason: 'bounce', providerEmailId: 'em_9' },
    ]);
  });

  it('acknowledges other events without storing anything', async () => {
    const record = vi.fn();
    const body = JSON.stringify({ type: 'email.delivered', data: { to: ['a@example.test'] } });
    const res = await handleWebhook(signedRequest(body), { webhookSecret, record });
    expect(res.status).toBe(204);
    expect(record).not.toHaveBeenCalled();
  });
});
