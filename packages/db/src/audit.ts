/**
 * Consent records and the audit log (BB-11). Raw reads and writes only; the rules for which
 * consents exist and which actions are audited live in apps/web/src/server/consent.
 * `audit_log` is append-only: a database trigger refuses updates and deletes. A check constraint
 * keeps names and free text out: actor and target must be ids.
 * These helpers do no authorization. Only `apps/web/src/server/consent` and the operator script
 * `audit-user.ts` call them. Pages and routes may not import `@basabridge/db` at all (BB-10).
 */
import { desc, eq, or } from 'drizzle-orm';
import type { Db } from './queries';
import { auditLog, consents } from './schema';

/** Every action that must leave an audit entry. Free text is not accepted. */
export const AUDIT_ACTIONS = [
  'guardian_approved',
  'guardian_declined',
  'guardian_expired',
  'link_created',
  'link_revoked',
  'data_exported',
  'account_deleted',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type ConsentRow = typeof consents.$inferSelect;
export type AuditRow = typeof auditLog.$inferSelect;

export async function insertConsent(
  db: Db,
  values: { userId: string; kind: string; version: number },
): Promise<ConsentRow> {
  const [row] = await db.insert(consents).values(values).returning();
  return row!;
}

export async function listConsents(db: Db, userId: string): Promise<ConsentRow[]> {
  return db.select().from(consents).where(eq(consents.userId, userId)).orderBy(consents.givenAt);
}

export async function insertAudit(
  db: Db,
  values: { actorUserId: string | null; action: AuditAction; target: string | null },
): Promise<AuditRow> {
  const [row] = await db.insert(auditLog).values(values).returning();
  return row!;
}

/** Every entry where the user acted or was the target, newest first. */
export async function listAuditFor(db: Db, userId: string): Promise<AuditRow[]> {
  return db
    .select()
    .from(auditLog)
    .where(or(eq(auditLog.actorUserId, userId), eq(auditLog.target, userId)))
    .orderBy(desc(auditLog.at));
}
