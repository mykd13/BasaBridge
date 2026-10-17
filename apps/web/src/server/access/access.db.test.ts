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
let parent: Viewer;
let stranger: Viewer;
let sessionId: string;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;

  const s = await createUser(db, { role: 'student', username: 'access-s', passwordHash: 'x' });
  const p = await createUser(db, { role: 'parent', username: 'access-p', passwordHash: 'x' });
  const q = await createUser(db, { role: 'parent', username: 'access-q', passwordHash: 'x' });
  await createLearner(db, s.id);
  student = { id: s.id, role: 'student' };
  parent = { id: p.id, role: 'parent' };
  stranger = { id: q.id, role: 'parent' };

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

  await db.insert(parentLinks).values({
    parentUserId: p.id,
    learnerUserId: s.id,
    status: 'active',
    sharesProgress: true,
    sharesAnalysis: false,
  });
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
    expect(await canRead(parent, student.id, 'tries', db)).toBe(false);
    expect(await canRead(parent, student.id, 'audio', db)).toBe(false);
  });

  it('refuses a parent who is not linked', async () => {
    await expect(readLearnerLevel(stranger, student.id, db)).rejects.toBeInstanceOf(AccessDenied);
    await expect(readReadingSession(stranger, sessionId, db)).rejects.toThrow('not_linked');
  });

  it('applies a revoke on the very next call', async () => {
    expect(await readLearnerLevel(parent, student.id, db)).toBeDefined();
    await testDb.exec(`update parent_links set status = 'revoked' where parent_user_id = $1`, [
      parent.id,
    ]);
    await expect(readLearnerLevel(parent, student.id, db)).rejects.toThrow('link_not_active');
  });
});
