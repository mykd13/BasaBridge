import {
  ComprehensionSkill,
  Level,
  PlacementResult,
  TryCondition,
  TryReview,
} from '@basabridge/contracts';
import { z } from 'zod';

/**
 * What each student screen shows, as the server hands it over. These are view models, not
 * database rows. They are built from shapes in packages/contracts where one exists.
 *
 * Nothing here can carry an answer key, a supporting sentence, audio or a name that is not
 * meant for the screen. Level numbers, tries and pass counts are filled in by the server from
 * packages/levels and packages/mastery. The browser only displays them (AGENTS.md rules 1, 5, 6).
 */

const Count = z.number().int().nonnegative();

/** A note from the AI Teacher, or the standard wording when the AI was not used. */
export const TeacherNote = z.object({
  text: z.string().min(1),
  source: z.enum(['ai', 'standard']),
});
export type TeacherNote = z.infer<typeof TeacherNote>;

// ---- home (BB-31) -----------------------------------------------------------

export const StudentHome = z.object({
  /** The name to greet, or null to greet without one. Never sent to a model or a log. */
  displayName: z.string().min(1).nullable(),
  level: Level,
  maxLevel: z.number().int().positive(),
  /** Passes toward the next level. null when the learner is at the top level. */
  progress: z
    .object({ passed: Count, needed: z.number().int().positive(), nextLevel: Level })
    .nullable(),
  /** From packages/levels. null means unlimited. */
  triesPerStory: z.number().int().positive().nullable(),
  words: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }),
  /** The latest teacher note. null until the learner has read a story. */
  note: TeacherNote.nullable(),
});
export type StudentHome = z.infer<typeof StudentHome>;

// ---- reading session (BB-32) ------------------------------------------------

/** One line in a list of tries: the share of words read right on that try. */
export const TryLine = z.object({
  n: z.number().int().positive(),
  pct: z.number().min(0).max(100),
  best: z.boolean().default(false),
});
export type TryLine = z.infer<typeof TryLine>;

export const Reading = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ready'),
    sessionId: z.string().uuid(),
    level: Level,
    title: z.string().min(1),
    text: z.string().min(1),
    /** The try this reading will be, counted by the server. */
    tryNumber: z.number().int().positive(),
    /** null means unlimited tries. */
    triesAllowed: z.number().int().positive().nullable(),
    /** The server's decision. The under-13 gate lives there, not in the browser. */
    micAllowed: z.boolean(),
  }),
  z.object({
    status: z.literal('tries_used'),
    level: Level,
    triesAllowed: z.number().int().positive(),
    bestTry: z.number().int().positive(),
    tries: z.array(TryLine).min(1),
    note: TeacherNote.nullable(),
  }),
]);
export type Reading = z.infer<typeof Reading>;

export const Analysis = z.object({
  /** The session these words belong to. A word tap is recorded on that session's answers. */
  sessionId: z.string().uuid(),
  completed: z.boolean(),
  tryNumber: z.number().int().positive(),
  triesAllowed: z.number().int().positive().nullable(),
  /** null when tries are unlimited. */
  triesLeft: Count.nullable(),
  wordsRight: Count,
  wordsTotal: z.number().int().positive(),
  wordsPerMinute: z.number().nonnegative(),
  tries: z.array(TryLine),
  notes: z.array(TeacherNote),
  /** Story words worth practising. Words only, never audio. */
  practiceWords: z.array(z.string().min(1)),
  /** Words that were hard to hear. The learner can tap one to say it was read right. */
  unclearWords: z.array(z.object({ index: Count, word: z.string().min(1) })),
  review: TryReview,
  conditions: z.array(TryCondition),
  /** Set when the learner stopped before the end of the story. */
  stoppedAt: z.object({ word: z.string().min(1), excerpt: z.string().min(1) }).nullable(),
});
export type Analysis = z.infer<typeof Analysis>;

export const TryFinish = z.object({
  /** Where to go next. The server decides: analysis for audio, questions for silent reading. */
  next: z.enum(['analysis', 'questions']),
});
export type TryFinish = z.infer<typeof TryFinish>;

// ---- questions (BB-33) ------------------------------------------------------

/**
 * One question for the screen. It has no answer index, no evidence sentence and no story text:
 * the story stays hidden while questions are answered, and the server scores every answer.
 */
export const QuestionView = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('question'),
    sessionId: z.string().uuid(),
    questionId: z.string().uuid(),
    /** Counting from 1. */
    index: z.number().int().positive(),
    total: z.number().int().positive(),
    text: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(6),
    /** True when the learner's reading help offers the question read aloud. */
    readAloud: z.boolean(),
  }),
  z.object({ status: z.literal('complete') }),
]);
export type QuestionView = z.infer<typeof QuestionView>;

export const AnswerFeedback = z.object({
  correct: z.boolean(),
  chosenIndex: Count,
  /** Shown only after the answer is scored. */
  correctIndex: Count,
  /** True when this was the last question. */
  last: z.boolean(),
  /** A lesson to offer for a wrong answer. null when none fits. */
  learnLessonId: z.string().min(1).nullable(),
});
export type AnswerFeedback = z.infer<typeof AnswerFeedback>;

export const ResultView = z.object({
  level: Level,
  answered: z.object({ right: Count, total: z.number().int().positive() }),
  readToEnd: z.boolean(),
  /** True when the learner read without the microphone. No reading figures then. */
  silent: z.boolean(),
  wordsRightPct: z.number().min(0).max(100).nullable(),
  skills: z.array(
    z.object({ skill: ComprehensionSkill, right: Count, total: z.number().int().positive() }),
  ),
  note: TeacherNote.nullable(),
  passed: z.boolean(),
  /** Passes in a row toward the next level. null when the level cannot move up. */
  passedInRow: z.object({ passed: Count, needed: z.number().int().positive() }).nullable(),
  levelChange: z.object({ from: Level, to: Level }).nullable(),
  /** A lesson offered when the story was not passed. */
  learn: z.object({ lessonId: z.string().min(1), skill: ComprehensionSkill }).nullable(),
});
export type ResultView = z.infer<typeof ResultView>;

export const LevelUpView = z.object({
  level: Level,
  passedInRow: z.number().int().positive(),
  words: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }),
  triesBefore: z.number().int().positive().nullable(),
  triesNow: z.number().int().positive().nullable(),
  /** The next level where tries drop, or null. */
  nextTries: z.object({ level: Level, tries: z.number().int().positive() }).nullable(),
});
export type LevelUpView = z.infer<typeof LevelUpView>;

// ---- placement (BB-51) ------------------------------------------------------

export const PlacementStep = z.discriminatedUnion('step', [
  z.object({
    step: z.literal('intro'),
    /** False when a parent has not yet approved the microphone for this learner. */
    micApproved: z.boolean(),
  }),
  z.object({ step: z.literal('between'), storyNumber: z.number().int().min(2) }),
  z.object({
    step: z.literal('result'),
    result: PlacementResult,
    maxLevel: z.number().int().positive(),
    strongSkill: ComprehensionSkill.nullable(),
    practiceSkill: ComprehensionSkill.nullable(),
    retakeDays: z.number().int().positive(),
  }),
]);
export type PlacementStep = z.infer<typeof PlacementStep>;
