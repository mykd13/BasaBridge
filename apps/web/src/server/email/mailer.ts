/**
 * How the app sends email (BB-64, ADR 0006). Server only.
 *
 * Local development and tests use the capture mailer, which keeps messages in memory and sends
 * nothing. Production must have a Resend key, or sending fails loudly instead of silently.
 * Logs name the template only, never the address or a link.
 */
import type { RenderedEmail } from './templates';

export interface OutgoingEmail extends RenderedEmail {
  to: string;
}

export interface Mailer {
  send(email: OutgoingEmail): Promise<{ id: string }>;
}

export interface CaptureMailer extends Mailer {
  readonly sent: OutgoingEmail[];
  clear(): void;
}

export function createCaptureMailer(): CaptureMailer {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    async send(email) {
      sent.push(email);
      console.info(`[email] captured ${email.template} (not sent)`);
      return { id: `captured-${sent.length}` };
    },
    clear() {
      sent.length = 0;
    },
  };
}

export interface ResendOptions {
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
  /** A hung provider must not hang the caller, for example a password reset request. */
  timeoutMs?: number;
}

export const RESEND_TIMEOUT_MS = 10_000;

export function createResendMailer({
  apiKey,
  from,
  fetchImpl = fetch,
  timeoutMs = RESEND_TIMEOUT_MS,
}: ResendOptions): Mailer {
  return {
    async send(email) {
      const res = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          text: email.text,
          html: email.html,
          tags: [{ name: 'template', value: email.template }],
        }),
      });
      if (!res.ok) {
        // The status is enough to debug. The body can echo the address, so it is not logged.
        throw new Error(`Email provider refused ${email.template} with status ${res.status}`);
      }
      const body = (await res.json()) as { id?: string };
      if (!body.id) throw new Error(`Email provider gave no id for ${email.template}`);
      return { id: body.id };
    },
  };
}

/** Picks the mailer from the environment. */
export function mailerFromEnv(env: NodeJS.ProcessEnv = process.env): Mailer {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (apiKey && from) return createResendMailer({ apiKey, from });
  if (env.NODE_ENV === 'production') {
    throw new Error('RESEND_API_KEY and EMAIL_FROM must be set in production.');
  }
  return createCaptureMailer();
}

/** Only for local development and tests. Production refuses to use it. */
const DEV_EMAIL_HASH_SECRET = 'dev-only-email-hash-secret';

/**
 * The key for hashing suppressed addresses (EMAIL_HASH_SECRET). Set it once per database:
 * changing it makes every stored suppression unmatchable.
 */
export function emailHashSecret(env: Record<string, string | undefined> = process.env): string {
  if (env.EMAIL_HASH_SECRET) return env.EMAIL_HASH_SECRET;
  if (env.NODE_ENV === 'production') {
    throw new Error('EMAIL_HASH_SECRET must be set in production.');
  }
  return DEV_EMAIL_HASH_SECRET;
}
