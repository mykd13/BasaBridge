import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from './schema';
import {
  createLearner,
  createReadingSession,
  createUser,
  deleteUser,
  getLearner,
  getStoryWithQuestions,
  getUserById,
  insertAnswer,
  insertQuestions,
  insertStory,
  insertTry,
  type Db,
} from './queries';

let db: Db;

beforeAll(async () => {
  const pg = drizzle(new PGlite(), { schema });
  await migrate(pg, { migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)) });
  db = pg as unknown as Db;
});

async function count(table: string, column: string, id: string) {
  const res = await db.execute(
    sql`select count(*)::int as n from ${sql.identifier(table)} where ${sql.identifier(column)} = ${id}`,
  );
  const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as { n: number }[];
  return rows[0]!.n;
}

describe('deleting a user', () => {
  it('removes all of their learner data and keeps shared content', async () => {
    const student = await createUser(db, {
      role: 'student',
      username: 'cascade-student',
      name: 'cascade-student',
      email: 'cascade-student@example.test',
    });
    const parent = await createUser(db, {
      role: 'parent',
      username: 'cascade-parent',
      name: 'cascade-parent',
      email: 'cascade-parent@example.test',
    });
    await createLearner(db, student.id, 4);
    await db
      .insert(schema.parentLinks)
      .values({ parentUserId: parent.id, learnerUserId: student.id });
    await db.insert(schema.linkCodes).values({
      code: 'cascade-code',
      learnerUserId: student.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await db
      .insert(schema.guardianApprovals)
      .values({ learnerUserId: student.id, guardianEmail: 'guardian@example.test' });
    await db.insert(schema.consents).values({ userId: student.id, kind: 'terms', version: 1 });
    await db.insert(schema.learnerSettings).values({ userId: student.id });
    await db.insert(schema.decisions).values({
      learnerUserId: student.id,
      kind: 'level',
      title: 't',
      summary: 's',
    });
    await db.insert(schema.placementSessions).values({ learnerUserId: student.id, startLevel: 1 });
    await db.insert(schema.abilityEstimates).values({
      learnerUserId: student.id,
      scope: 'comprehension',
      weights: [],
      mean: 0,
      sd: 1,
    });
    await db
      .insert(schema.lessonProgress)
      .values({ learnerUserId: student.id, lessonId: 'lesson-1' });

    const story = await insertStory(db, {
      level: 1,
      title: 'Story',
      text: 'The cat sat.',
      words: 3,
      readingGrade: 1,
      source: 'bank',
    });
    const [question] = await insertQuestions(db, [
      {
        storyId: story.id,
        skill: 'literal',
        text: 'Who sat?',
        options: ['cat', 'dog'],
        answerIndex: 0,
        evidence: 'The cat sat.',
      },
    ]);
    const session = await createReadingSession(db, {
      learnerUserId: student.id,
      storyId: story.id,
      triesAllowed: 3,
    });
    const tryRow = await insertTry(db, {
      sessionId: session.id,
      completed: true,
      wordsTotal: 3,
      wordsRight: 3,
      wordsPerMinute: 60,
      analysis: {},
    });
    await db.insert(schema.audioObjects).values({
      tryId: tryRow.id,
      storageKey: 'k',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await insertAnswer(db, {
      sessionId: session.id,
      questionId: question!.id,
      chosen: 0,
      correct: true,
    });

    expect(await count('answers', 'session_id', session.id)).toBe(1);

    await deleteUser(db, student.id);

    expect(await getUserById(db, student.id)).toBeUndefined();
    expect(await getLearner(db, student.id)).toBeUndefined();
    for (const [table, column] of [
      ['parent_links', 'learner_user_id'],
      ['link_codes', 'learner_user_id'],
      ['guardian_approvals', 'learner_user_id'],
      ['consents', 'user_id'],
      ['learner_settings', 'user_id'],
      ['decisions', 'learner_user_id'],
      ['placement_sessions', 'learner_user_id'],
      ['ability_estimates', 'learner_user_id'],
      ['lesson_progress', 'learner_user_id'],
      ['reading_sessions', 'learner_user_id'],
    ] as const) {
      expect(await count(table, column, student.id), table).toBe(0);
    }
    expect(await count('tries', 'session_id', session.id)).toBe(0);
    expect(await count('answers', 'session_id', session.id)).toBe(0);
    expect(await count('audio_objects', 'try_id', tryRow.id)).toBe(0);

    // The parent and the shared story are untouched.
    expect(await getUserById(db, parent.id)).toBeDefined();
    expect((await getStoryWithQuestions(db, story.id))?.questions).toHaveLength(1);
  });

  it('rejects a duplicate parent link', async () => {
    const parent = await createUser(db, {
      role: 'parent',
      username: 'dup-p',
      name: 'dup-p',
      email: 'dup-p@example.test',
    });
    const student = await createUser(db, {
      role: 'student',
      username: 'dup-s',
      name: 'dup-s',
      email: 'dup-s@example.test',
    });
    const link = { parentUserId: parent.id, learnerUserId: student.id };
    await db.insert(schema.parentLinks).values(link);
    await expect(db.insert(schema.parentLinks).values(link)).rejects.toThrow();
  });
});
