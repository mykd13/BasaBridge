/**
 * Consent records and the audit log (BB-11). Raw reads and writes only; the rules for which
 * consents exist and which actions are audited live in apps/web/src/server/consent.
 * `audit_log` is append-only: a database trigger refuses updates and deletes.
 */
import { desc, eq, or } from 'drizzle-orm';
import type { Db } from './queries';
import { auditLog, consents } from './schema';

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
  values: { actorUserId: string | null; action: string; target: string | null },
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
