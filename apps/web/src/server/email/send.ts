import { getSuppression, type Db } from '@basabridge/db';
import type { Mailer, OutgoingEmail } from './mailer';

export type SendResult =
  | { status: 'sent'; id: string }
  /** The address bounced or complained before. Callers tell the learner (BB-8). */
  | { status: 'suppressed'; reason: string };

/** The one way the app sends mail. Refuses addresses on the suppression list. */
export async function sendEmail(
  mailer: Mailer,
  lookup: (address: string) => ReturnType<typeof getSuppression>,
  email: OutgoingEmail,
): Promise<SendResult> {
  const suppressed = await lookup(email.to);
  if (suppressed) return { status: 'suppressed', reason: suppressed.reason };
  const { id } = await mailer.send(email);
  return { status: 'sent', id };
}

export const suppressionLookup = (db: Db) => (address: string) => getSuppression(db, address);
