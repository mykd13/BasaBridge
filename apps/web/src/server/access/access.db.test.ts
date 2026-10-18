import {
  createLearner,
  createReadingSession,
  createUser,
  insertStory,
  parentLinks,
  type Db,
} from '@basabridge/db';
import { createTestDb, type TestDb } from '@basabridge/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccessDenied, canRead, readLearnerLevel, readReadingSession, type Viewer } from './index';

let testDb: TestDb;
let db: Db;
let student: Viewer;
let otherStudent: Viewer;
let parent: Viewer;
let stranger: Viewer;
let progressOff: Viewer;
let pendingParent: Viewer;
let sessionId: string;
const missingSessionId = '99999999-9999-4999-8999-999999999999';

async function parentUser(username: string): Promise<Viewer> {
  const u = await createUser(db, { role: 'parent', username, passwordHash: 'x' });
  return { id: u.id, role: 'parent' };
}

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;

  const s = await createUser(db, { role: 'student', username: 'access-s', passwordHash: 'x' });
  const o = await createUser(db, { role: 'student', username: 'access-o', passwordHash: 'x' });
  await createLearner(db, s.id);
  await createLearner(db, o.id);
  student = { id: s.id, role: 'student' };
  otherStudent = { id: o.id, role: 'student' };
  parent = await parentUser('access-p');
  stranger = await parentUser('access-q');
  progressOff = await parentUser('access-np');
  pendingParent = await parentUser('access-pp');

  const story = await insertStory(db, {
    level: 1,
    title: 'T',
    text: 'The cat sat.',
    words: 3,
    readingGrade: 1,
    source: 'bank',
  });
  sessionId = (
    await createReadingSession(db, { learnerUserId: s.id, storyId: story.id, triesAllowed: 3 })
  ).id;

  await db.insert(parentLinks).values([
    {
      parentUserId: parent.id,
      learnerUserId: s.id,
      status: 'active',
      sharesProgress: true,
      sharesAnalysis: false,
    },
    {
      parentUserId: progressOff.id,
      learnerUserId: s.id,
      status: 'active',
      sharesProgress: false,
      sharesAnalysis: true,
    },
    {
      parentUserId: pendingParent.id,
      learnerUserId: s.id,
      status: 'pending',
      sharesProgress: true,
      sharesAnalysis: true,
    },
  ]);
});

afterAll(() => testDb.close());

describe('access against a real database', () => {
  it('lets the student read their own level and session', async () => {
    expect(await readLearnerLevel(student, student.id, db)).toEqual({ level: 1, levelPasses: 0 });
    expect((await readReadingSession(student, sessionId, db))?.id).toBe(sessionId);
  });

  it('lets a linked parent read shared progress but not unshared analysis or audio', async () => {
    expect(await canRead(parent, student.id, 'level', db)).toBe(true);
    expect(await canRead(parent, student.id, 'sessions', db)).toBe(true);
    expect((await readReadingSession(parent, sessionId, db))?.id).toBe(sessionId);
    expect(await canRead(parent, student.id, 'tries', db)).toBe(false);
    expect(await canRead(parent, student.id, 'audio', db)).toBe(false);
  });

  it('refuses a signed-out viewer before loading anything', async () => {
    await expect(readLearnerLevel(null, student.id, db)).rejects.toThrow('not_signed_in');
    await expect(readReadingSession(null, sessionId, db)).rejects.toThrow('not_signed_in');
    await expect(readReadingSession(null, missingSessionId, db)).rejects.toThrow('not_signed_in');
  });

  it('refuses a parent who is not linked', async () => {
    await expect(readLearnerLevel(stranger, student.id, db)).rejects.toBeInstanceOf(AccessDenied);
    expect(await readReadingSession(stranger, sessionId, db)).toBeUndefined();
  });

  it('refuses a parent whose link does not share progress', async () => {
    expect(await canRead(progressOff, student.id, 'sessions', db)).toBe(false);
    await expect(readLearnerLevel(progressOff, student.id, db)).rejects.toThrow('not_shared');
    expect(await readReadingSession(progressOff, sessionId, db)).toBeUndefined();
  });

  it('refuses a parent whose link is still pending', async () => {
    await expect(readLearnerLevel(pendingParent, student.id, db)).rejects.toThrow(
      'link_not_active',
    );
    expect(await readReadingSession(pendingParent, sessionId, db)).toBeUndefined();
  });

  it("gives the same answer for a missing session and someone else's session", async () => {
    const missing = await readReadingSession(otherStudent, missingSessionId, db);
    const notTheirs = await readReadingSession(otherStudent, sessionId, db);
    expect(missing).toBeUndefined();
    expect(notTheirs).toBeUndefined();
    expect(await readReadingSession(stranger, missingSessionId, db)).toBeUndefined();
  });

  it('applies a revoke on the very next call', async () => {
    expect(await readLearnerLevel(parent, student.id, db)).toBeDefined();
    await testDb.exec(`update parent_links set status = 'revoked' where parent_user_id = $1`, [
      parent.id,
    ]);
    await expect(readLearnerLevel(parent, student.id, db)).rejects.toThrow('link_not_active');
    expect(await readReadingSession(parent, sessionId, db)).toBeUndefined();
  });
});
