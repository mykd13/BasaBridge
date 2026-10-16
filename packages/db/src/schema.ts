/**
 * First cut of the data model (docs/PLAN.md section 5). Owner: Rhett (BB-03).
 * Every table that holds a learner id must be read through the authorization layer (BB-10):
 * parents see learner data only through an active parent_links row and its share flags.
 * Nothing here stores audio unless audio_objects is used, which only happens when retention is on.
 */
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['student', 'parent']);
export const linkStatusEnum = pgEnum('link_status', ['pending', 'active', 'revoked']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'declined']);
export const skillEnum = pgEnum('skill', ['vocabulary', 'literal', 'inferential']);
export const storySourceEnum = pgEnum('story_source', ['generated', 'bank']);
export const sessionStatusEnum = pgEnum('session_status', ['reading', 'answering', 'done']);
export const decisionKindEnum = pgEnum('decision_kind', [
  'story',
  'level',
  'plan',
  'analysis',
  'tries',
]);

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: id(),
  role: roleEnum('role').notNull(),
  username: text('username').notNull().unique(),
  email: text('email'),
  passwordHash: text('password_hash').notNull(),
  /** Birth year band is enough for the age gate. Do not store a full birth date. */
  ageBand: text('age_band'),
  createdAt: createdAt(),
});

export const learners = pgTable('learners', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  grade: integer('grade'),
  level: integer('level').notNull().default(1),
  levelPasses: integer('level_passes').notNull().default(0),
  keepAudio: boolean('keep_audio').notNull().default(false),
});

export const parentLinks = pgTable('parent_links', {
  id: id(),
  parentUserId: uuid('parent_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  learnerUserId: uuid('learner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: linkStatusEnum('status').notNull().default('pending'),
  sharesProgress: boolean('shares_progress').notNull().default(true),
  sharesAnalysis: boolean('shares_analysis').notNull().default(true),
  createdAt: createdAt(),
});

export const linkCodes = pgTable('link_codes', {
  code: text('code').primaryKey(),
  learnerUserId: uuid('learner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export const guardianApprovals = pgTable('guardian_approvals', {
  id: id(),
  learnerUserId: uuid('learner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  guardianEmail: text('guardian_email').notNull(),
  status: approvalStatusEnum('status').notNull().default('pending'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const consents = pgTable('consents', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  version: integer('version').notNull(),
  givenAt: timestamp('given_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stories = pgTable('stories', {
  id: id(),
  level: integer('level').notNull(),
  title: text('title').notNull(),
  text: text('text').notNull(),
  words: integer('words').notNull(),
  readingGrade: real('reading_grade').notNull(),
  source: storySourceEnum('source').notNull(),
  checks: jsonb('checks').notNull().default({}),
  createdAt: createdAt(),
});

export const questions = pgTable('questions', {
  id: id(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id, { onDelete: 'cascade' }),
  skill: skillEnum('skill').notNull(),
  word: text('word'),
  text: text('text').notNull(),
  options: jsonb('options').notNull(),
  answerIndex: integer('answer_index').notNull(),
  evidence: text('evidence').notNull(),
  /** Sub-skill, question type and distractor types from packages/contracts (ADR 0003). */
  subskill: text('subskill'),
  type: text('type').notNull().default('multiple_choice'),
  distractors: jsonb('distractors'),
  /** Calibrated difficulty on the ability scale. Null until enough answers exist (BB-45). */
  difficulty: real('difficulty'),
});

export const readingSessions = pgTable('reading_sessions', {
  id: id(),
  learnerUserId: uuid('learner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id),
  triesAllowed: integer('tries_allowed'),
  triesUsed: integer('tries_used').notNull().default(0),
  countedTryId: uuid('counted_try_id'),
  status: sessionStatusEnum('status').notNull().default('reading'),
  createdAt: createdAt(),
});

export const tries = pgTable('tries', {
  id: id(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => readingSessions.id, { onDelete: 'cascade' }),
  completed: boolean('completed').notNull(),
  wordsTotal: integer('words_total').notNull(),
  wordsRight: integer('words_right').notNull(),
  wordsPerMinute: integer('words_per_minute').notNull(),
  /** TryAnalysis from @basabridge/contracts. */
  analysis: jsonb('analysis').notNull(),
  createdAt: createdAt(),
});

export const answers = pgTable('answers', {
  id: id(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => readingSessions.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id),
  chosen: integer('chosen').notNull(),
  correct: boolean('correct').notNull(),
  /** Evidence quality (ADR 0003). Rushed answers and supported tries count for less. */
  responseMs: integer('response_ms'),
  rushed: boolean('rushed').notNull().default(false),
  accommodations: jsonb('accommodations').notNull().default([]),
  weight: real('weight').notNull().default(1),
});

export const decisions = pgTable('decisions', {
  id: id(),
  learnerUserId: uuid('learner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: decisionKindEnum('kind').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  evidence: jsonb('evidence').notNull().default({}),
  createdAt: createdAt(),
});

/** Only written when the learner turned audio retention on. Rows expire after 30 days. */
export const audioObjects = pgTable('audio_objects', {
  id: id(),
  tryId: uuid('try_id')
    .notNull()
    .references(() => tries.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: id(),
  actorUserId: uuid('actor_user_id'),
  action: text('action').notNull(),
  target: text('target'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});

/** One placement test per learner attempt. The result sets the starting level (docs/PLAN.md 6.2). */
export const placementSessions = pgTable('placement_sessions', {
  id: id(),
  learnerUserId: uuid('learner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startLevel: integer('start_level').notNull(),
  /** PlacementState stories so far, so a paused placement can resume. */
  progress: jsonb('progress').notNull().default({}),
  /** PlacementResult from packages/contracts, set when finished. */
  result: jsonb('result'),
  voice: boolean('voice').notNull().default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

/** Belief about ability per skill, as a distribution over the ability grid (packages/mastery). */
export const abilityEstimates = pgTable(
  'ability_estimates',
  {
    learnerUserId: uuid('learner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** comprehension, vocabulary, literal or inferential. */
    scope: text('scope').notNull(),
    weights: jsonb('weights').notNull(),
    mean: real('mean').notNull(),
    sd: real('sd').notNull(),
    items: integer('items').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.learnerUserId, t.scope] })],
);

/** Running answer statistics per question, used to calibrate and retire items (BB-45). */
export const itemStats = pgTable('item_stats', {
  questionId: uuid('question_id')
    .primaryKey()
    .references(() => questions.id, { onDelete: 'cascade' }),
  attempts: integer('attempts').notNull().default(0),
  correct: integer('correct').notNull().default(0),
  retired: boolean('retired').notNull().default(false),
});

/** Lessons live in the repo as reviewed content. This table only tracks each learner's progress. */
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    learnerUserId: uuid('learner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lessonId: text('lesson_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    recheckCorrect: integer('recheck_correct').notNull().default(0),
    recheckTotal: integer('recheck_total').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.learnerUserId, t.lessonId] })],
);

/** Per-learner settings such as the reading help preset (ADR 0004). */
export const learnerSettings = pgTable('learner_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** ReadingHelp from packages/contracts. */
  readingHelp: jsonb('reading_help').notNull().default({}),
});
