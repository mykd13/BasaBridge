import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { insertAudit, insertConsent, listAuditFor, listConsents } from './audit';
import { auditReport } from './audit-user';
import { createUser, deleteUser, type Db } from './queries';
import * as schema from './schema';

let client: PGlite;
let db: Db;

beforeAll(async () => {
  client = new PGlite();
  const pg = drizzle(client, { schema });
  await migrate(pg, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  db = pg as unknown as Db;
});

describe('audit log', () => {
  it('accepts new entries and lists them for the actor and the target', async () => {
    const actor = await createUser(db, { role: 'student', username: 'audit-a', passwordHash: 'x' });
    const target = await createUser(db, { role: 'parent', username: 'audit-t', passwordHash: 'x' });
    await insertAudit(db, { actorUserId: actor.id, action: 'link_created', target: target.id });
    expect((await listAuditFor(db, actor.id)).map((a) => a.action)).toEqual(['link_created']);
    expect((await listAuditFor(db, target.id)).map((a) => a.action)).toEqual(['link_created']);
  });

  it('refuses updates, deletes and truncate, even from raw SQL', async () => {
    await expect(client.query(`update audit_log set action = 'changed'`)).rejects.toThrow(
      'append-only',
    );
    await expect(client.query(`delete from audit_log`)).rejects.toThrow('append-only');
    await expect(client.query(`truncate audit_log`)).rejects.toThrow('append-only');
    const res = await client.query<{ n: number }>(`select count(*)::int as n from audit_log`);
    expect(res.rows[0]!.n).toBeGreaterThan(0);
  });

  it('keeps entries after the user is deleted, since they hold ids only', async () => {
    const u = await createUser(db, { role: 'student', username: 'audit-gone', passwordHash: 'x' });
    await insertAudit(db, { actorUserId: u.id, action: 'account_deleted', target: u.id });
    await deleteUser(db, u.id);
    expect((await listAuditFor(db, u.id)).map((a) => a.action)).toEqual(['account_deleted']);
  });
});

describe('consents', () => {
  it('stores each consent with its version, oldest first', async () => {
    const u = await createUser(db, { role: 'student', username: 'consent-u', passwordHash: 'x' });
    await insertConsent(db, { userId: u.id, kind: 'microphone', version: 1 });
    await insertConsent(db, { userId: u.id, kind: 'microphone', version: 2 });
    expect((await listConsents(db, u.id)).map((c) => c.version)).toEqual([1, 2]);
  });
});

describe('admin report', () => {
  it("lists a user's consents and audit trail with no names", async () => {
    const u = await createUser(db, {
      role: 'student',
      username: 'report-maria',
      email: 'maria@example.test',
      passwordHash: 'x',
    });
    await insertConsent(db, { userId: u.id, kind: 'stored_results', version: 1 });
    await insertAudit(db, { actorUserId: null, action: 'guardian_approved', target: u.id });
    const report = await auditReport(db, u.id);
    expect(report.consents).toMatchObject([{ kind: 'stored_results', version: 1 }]);
    expect(report.audit).toMatchObject([{ action: 'guardian_approved', target: u.id }]);
    const text = JSON.stringify(report);
    expect(text).not.toContain('report-maria');
    expect(text).not.toContain('maria@example.test');
  });
});
