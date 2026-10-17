/**
 * Typed query helpers. These are the low-level reads and writes only.
 * They do not check who is asking: learner data must be reached through the authorization
 * layer (BB-10), which calls these. Pages and routes must not call them directly for learner data.
 */
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

/** Any Drizzle Postgres database built with this schema (postgres-js in the app, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;
export type Learner = typeof schema.learners.$inferSelect;
export type Story = typeof schema.stories.$inferSelect;
export type NewStory = typeof schema.stories.$inferInsert;
export type Question = typeof schema.questions.$inferSelect;
export type NewQuestion = typeof schema.questions.$inferInsert;
export type ReadingSession = typeof schema.readingSessions.$inferSelect;
export type NewTry = typeof schema.tries.$inferInsert;
export type NewAnswer = typeof schema.answers.$inferInsert;

export async function createUser(db: Db, values: NewUser): Promise<User> {
  const [row] = await db.insert(schema.users).values(values).returning();
  return row!;
}

export async function getUserById(db: Db, id: string): Promise<User | undefined> {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return row;
}

export async function getUserByUsername(db: Db, username: string): Promise<User | undefined> {
  const [row] = await db.select().from(schema.users).where(eq(schema.users.username, username));
  return row;
}

/** Deleting a user removes every learner row that points at them (foreign keys cascade). */
export async function deleteUser(db: Db, id: string): Promise<void> {
  await db.delete(schema.users).where(eq(schema.users.id, id));
}

export async function createLearner(db: Db, userId: string, grade?: number): Promise<Learner> {
  const [row] = await db
    .insert(schema.learners)
    .values({ userId, grade: grade ?? null })
    .returning();
  return row!;
}

export async function getLearner(db: Db, userId: string): Promise<Learner | undefined> {
  const [row] = await db.select().from(schema.learners).where(eq(schema.learners.userId, userId));
  return row;
}

export async function insertStory(db: Db, values: NewStory): Promise<Story> {
  const [row] = await db.insert(schema.stories).values(values).returning();
  return row!;
}

export async function insertQuestions(db: Db, values: NewQuestion[]): Promise<Question[]> {
  if (values.length === 0) return [];
  return db.insert(schema.questions).values(values).returning();
}

export async function getStoryWithQuestions(
  db: Db,
  storyId: string,
): Promise<{ story: Story; questions: Question[] } | undefined> {
  const [story] = await db.select().from(schema.stories).where(eq(schema.stories.id, storyId));
  if (!story) return undefined;
  const questions = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.storyId, storyId));
  return { story, questions };
}

export async function createReadingSession(
  db: Db,
  values: { learnerUserId: string; storyId: string; triesAllowed: number | null },
): Promise<ReadingSession> {
  const [row] = await db.insert(schema.readingSessions).values(values).returning();
  return row!;
}

export async function getReadingSession(db: Db, id: string): Promise<ReadingSession | undefined> {
  const [row] = await db
    .select()
    .from(schema.readingSessions)
    .where(eq(schema.readingSessions.id, id));
  return row;
}

export async function insertTry(db: Db, values: NewTry) {
  const [row] = await db.insert(schema.tries).values(values).returning();
  return row!;
}

export async function insertAnswer(db: Db, values: NewAnswer) {
  const [row] = await db.insert(schema.answers).values(values).returning();
  return row!;
}
