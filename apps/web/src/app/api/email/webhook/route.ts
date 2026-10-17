import { createDbFromEnv, suppressAddress, type Db } from '@basabridge/db';
import { suppressionsFrom, verifyWebhook } from '@/server/email/webhook';

export const runtime = 'nodejs';

let db: Db | undefined;

/** Resend calls this for bounces and complaints (BB-64). Every other event is acknowledged and ignored. */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response('Not configured', { status: 503 });

  const raw = await req.text();
  const ok = verifyWebhook(
    secret,
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

  const suppressions = suppressionsFrom(event);
  if (suppressions.length > 0) {
    db ??= createDbFromEnv().db as unknown as Db;
    for (const s of suppressions) {
      await suppressAddress(db, s.address, s.reason, s.providerEmailId);
    }
  }
  return new Response(null, { status: 204 });
}
