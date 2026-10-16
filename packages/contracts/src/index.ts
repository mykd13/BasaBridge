/**
 * Shared shapes between speech, learning engine, AI and UI.
 * Changes here need review from the owners on both sides (see CODEOWNERS).
 */
import { z } from 'zod';

export const Skill = z.enum(['decoding', 'fluency', 'vocabulary', 'literal', 'inferential']);
export type Skill = z.infer<typeof Skill>;

/** Skills measured from answered questions. Decoding and fluency come from reading aloud. */
export const ComprehensionSkill = z.enum(['vocabulary', 'literal', 'inferential']);
export type ComprehensionSkill = z.infer<typeof ComprehensionSkill>;

export const Role = z.enum(['student', 'parent']);
export type Role = z.infer<typeof Role>;

export const Level = z.number().int().min(1).max(100);

// ---- stories and questions -------------------------------------------------

export const StoryQuestion = z.object({
  skill: ComprehensionSkill,
  /** The vocabulary word, only for vocabulary questions. */
  word: z.string().nullable(),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  answerIndex: z.number().int().min(0).max(3),
  /** One sentence copied verbatim from the passage that supports the answer. */
  evidence: z.string().min(1),
});
export type StoryQuestion = z.infer<typeof StoryQuestion>;

export const Story = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  level: Level,
  words: z.number().int().positive(),
  readingGrade: z.number(),
  questions: z.array(StoryQuestion).min(4),
});
export type Story = z.infer<typeof Story>;

// ---- reading aloud ---------------------------------------------------------

/** What happened to one expected word when comparing speech to the text. */
export const WordOutcome = z.enum([
  'correct',
  'substitution',
  'omission',
  'insertion',
  'repetition',
  'self_correction',
]);
export type WordOutcome = z.infer<typeof WordOutcome>;

export const WordResult = z.object({
  expected: z.string().nullable(),
  heard: z.string().nullable(),
  outcome: WordOutcome,
  /** 0..1 confidence from the speech provider. Low confidence is flagged, not counted as an error. */
  confidence: z.number().min(0).max(1),
  /** Set when a student or linked parent marked the word as misheard. */
  markedMisheard: z.boolean().default(false),
});
export type WordResult = z.infer<typeof WordResult>;

export const TryAnalysis = z.object({
  completed: z.boolean(),
  /** Index of the last expected word reached. */
  lastWordIndex: z.number().int().min(-1),
  wordsTotal: z.number().int().nonnegative(),
  wordsRight: z.number().int().nonnegative(),
  seconds: z.number().nonnegative(),
  wordsPerMinute: z.number().nonnegative(),
  words: z.array(WordResult),
});
export type TryAnalysis = z.infer<typeof TryAnalysis>;

// ---- decisions and plans ---------------------------------------------------

export const DecisionKind = z.enum(['story', 'level', 'plan', 'analysis', 'tries']);
export type DecisionKind = z.infer<typeof DecisionKind>;

export const Decision = z.object({
  kind: DecisionKind,
  title: z.string(),
  summary: z.string(),
  evidence: z.record(z.string(), z.unknown()).default({}),
});
export type Decision = z.infer<typeof Decision>;

export const HomeActivity = z.object({
  title: z.string(),
  minutes: z.number().int().min(3).max(15),
  steps: z.array(z.string()).min(2).max(4),
  tip: z.string(),
  source: z.enum(['ai', 'standard']),
});
export type HomeActivity = z.infer<typeof HomeActivity>;
