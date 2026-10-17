/**
 * Resend webhooks (BB-64). Resend signs them with Svix: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${raw body}`, keyed with the base64 part of the `whsec_` secret.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SuppressionReason } from '@basabridge/db';

/** Requests older or newer than this are refused, to stop replays. */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function verifyWebhook(
  secret: string,
  headers: WebhookHeaders,
  rawBody: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export interface Suppression {
  address: string;
  reason: SuppressionReason;
  providerEmailId: string | null;
}

/**
 * Turns an event into the addresses to suppress. Only permanent bounces and complaints count;
 * a temporary bounce (a full inbox) may succeed later.
 */
export function suppressionsFrom(event: unknown): Suppression[] {
  if (!event || typeof event !== 'object') return [];
  const { type, data } = event as { type?: unknown; data?: Record<string, unknown> };
  if (!data || !Array.isArray(data.to)) return [];
  const emailId = typeof data.email_id === 'string' ? data.email_id : null;
  let reason: SuppressionReason;
  if (type === 'email.complained') reason = 'complaint';
  else if (type === 'email.bounced') {
    const bounce = data.bounce as { type?: unknown } | undefined;
    if (bounce?.type !== 'Permanent') return [];
    reason = 'bounce';
  } else return [];
  return data.to
    .filter((a): a is string => typeof a === 'string' && a.includes('@'))
    .map((address) => ({ address, reason, providerEmailId: emailId }));
}

export interface WebhookDeps {
  /** RESEND_WEBHOOK_SECRET, or undefined when the webhook is not set up. */
  webhookSecret: string | undefined;
  /** Stores one suppression. The route passes the database write. */
  record: (s: Suppression) => Promise<void>;
}

/**
 * The webhook route's logic, kept apart from the route so it can be tested:
 * 503 when not set up, 401 on a bad signature, 400 on a bad body, 204 otherwise.
 * The raw body is read before parsing, because the signature covers the exact bytes.
 */
export async function handleWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  if (!deps.webhookSecret) return new Response('Not configured', { status: 503 });

  const raw = await req.text();
  const ok = verifyWebhook(
    deps.webhookSecret,
    {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
    },
    raw,
  );
  if (!ok) return new Response('Invalid signature', { status: 401 });

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad body', { status: 400 });
  }

  for (const s of suppressionsFrom(event)) await deps.record(s);
  return new Response(null, { status: 204 });
}
