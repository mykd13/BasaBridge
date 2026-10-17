import { createDbFromEnv, suppressAddress, type Db } from '@basabridge/db';
import { emailHashSecret } from '@/server/email/mailer';
import { handleWebhook } from '@/server/email/webhook';

export const runtime = 'nodejs';

let db: Db | undefined;

/** Resend calls this for bounces and complaints (BB-64). Every other event is acknowledged and ignored. */
export async function POST(req: Request) {
  return handleWebhook(req, {
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    record: async (s) => {
      db ??= createDbFromEnv().db as unknown as Db;
      await suppressAddress(db, emailHashSecret(), s.address, s.reason, s.providerEmailId);
    },
  });
}
