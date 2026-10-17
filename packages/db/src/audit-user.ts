/**
 * Prints one user's consents and audit trail as JSON (BB-11).
 * Run with `pnpm --filter @basabridge/db audit:user <user id>` and DATABASE_URL set.
 * Output holds ids, kinds, versions, actions and times only. No names, emails or audio.
 */
import { listAuditFor, listConsents } from './audit';
import { createDbFromEnv } from './client';
import type { Db } from './queries';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function auditReport(db: Db, userId: string) {
  const [consentRows, auditRows] = await Promise.all([
    listConsents(db, userId),
    listAuditFor(db, userId),
  ]);
  return {
    userId,
    consents: consentRows.map((c) => ({ kind: c.kind, version: c.version, givenAt: c.givenAt })),
    audit: auditRows.map((a) => ({
      at: a.at,
      action: a.action,
      actorUserId: a.actorUserId,
      target: a.target,
    })),
  };
}

const isMain = process.argv[1]?.replaceAll('\\', '/').endsWith('src/audit-user.ts');
if (isMain) {
  const userId = process.argv[2];
  if (!userId || !UUID.test(userId)) {
    console.error('Usage: pnpm --filter @basabridge/db audit:user <user id>');
    process.exit(1);
  }
  const { db, close } = createDbFromEnv();
  try {
    console.log(JSON.stringify(await auditReport(db as unknown as Db, userId), null, 2));
  } finally {
    await close();
  }
}
