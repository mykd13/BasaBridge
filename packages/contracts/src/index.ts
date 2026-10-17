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

// ---- comprehension taxonomy (ADR 0003) --------------------------------------

/** Fine-grained comprehension skills. Each rolls up to one of the three measured skills. */
export const SubSkill = z.enum([
  'word_in_context',
  'word_parts',
  'key_detail',
  'sequence',
  'main_idea',
  'cause_effect',
  'feelings',
  'prediction',
  'conclusion',
]);
export type SubSkill = z.infer<typeof SubSkill>;

export const SUBSKILL_PARENT: Record<SubSkill, ComprehensionSkill> = {
  word_in_context: 'vocabulary',
  word_parts: 'vocabulary',
  key_detail: 'literal',
  sequence: 'literal',
  main_idea: 'literal',
  cause_effect: 'inferential',
  feelings: 'inferential',
  prediction: 'inferential',
  conclusion: 'inferential',
};

export const QuestionType = z.enum(['multiple_choice', 'choose_all', 'order_events']);
export type QuestionType = z.infer<typeof QuestionType>;

/** Why a wrong option is wrong. A wrong answer then says what the reader likely misunderstood. */
export const DistractorType = z.enum([
  'wrong_detail',
  'opposite',
  'not_stated',
  'partly_right',
  'unrelated',
  'word_sense',
]);
export type DistractorType = z.infer<typeof DistractorType>;

/** Optional tags on a multiple-choice question. Required for new stories from BB-43. */
export const QuestionTags = z.object({
  subskill: SubSkill,
  /** One entry per option, in option order. null marks the correct option. */
  distractors: z.array(DistractorType.nullable()).length(4),
});
export type QuestionTags = z.infer<typeof QuestionTags>;

/** Choose every option that is true. Hard to guess. */
export const ChooseAllQuestion = z.object({
  type: z.literal('choose_all'),
  subskill: SubSkill,
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(4).max(6),
  answerIndexes: z.array(z.number().int().min(0)).min(1),
  evidence: z.string().min(1),
});
export type ChooseAllQuestion = z.infer<typeof ChooseAllQuestion>;

/** Put the events in the order they happened. Very hard to guess. */
export const OrderEventsQuestion = z.object({
  type: z.literal('order_events'),
  subskill: z.literal('sequence'),
  question: z.string().min(1),
  /** Events in the correct order. The app shuffles them for display. */
  events: z.array(z.string().min(1)).min(3).max(5),
  evidence: z.string().min(1),
});
export type OrderEventsQuestion = z.infer<typeof OrderEventsQuestion>;

/** What we record about one answer, beyond whether it was right. */
export const Accommodation = z.enum(['question_read_aloud', 'supported_try', 'word_tap']);
export type Accommodation = z.infer<typeof Accommodation>;

export const AnswerEvidence = z.object({
  correct: z.boolean(),
  responseMs: z.number().int().nonnegative(),
  rushed: z.boolean(),
  accommodations: z.array(Accommodation),
});
export type AnswerEvidence = z.infer<typeof AnswerEvidence>;

// ---- placement ------------------------------------------------------------

export const AbilityConfidence = z.enum(['none', 'early', 'building', 'steady']);
export type AbilityConfidence = z.infer<typeof AbilityConfidence>;

export const PlacementFlag = z.enum(['voice_missing', 'low_decoding', 'few_stories']);
export type PlacementFlag = z.infer<typeof PlacementFlag>;

export const PlacementResult = z.object({
  /** The level the learner starts the main course at. */
  level: Level,
  theta: z.number(),
  sd: z.number().nonnegative(),
  confidence: AbilityConfidence,
  storiesRead: z.number().int().nonnegative(),
  flags: z.array(PlacementFlag),
  recommendedHelp: z.enum(['standard', 'more']),
});
export type PlacementResult = z.infer<typeof PlacementResult>;

// ---- reading help (ADR 0004) ----------------------------------------------

export const ReadingHelp = z.object({
  /** Speak instructions aloud, with a speaker button on each. */
  audioInstructions: z.boolean().default(false),
  /** Offer to read each question and its options aloud. */
  questionReadAloud: z.boolean().default(false),
  textSize: z.enum(['small', 'medium', 'large']).default('medium'),
  lineSpacing: z.enum(['normal', 'wide']).default('normal'),
  /** Highlight the line being read and dim the rest. */
  readingRuler: z.boolean().default(false),
  /** Language of instructions and audio. Stories stay English. */
  language: z.enum(['en', 'fil']).default('en'),
  /** Use the shorter, simpler instruction wording. */
  simpleWords: z.boolean().default(false),
});
export type ReadingHelp = z.infer<typeof ReadingHelp>;

export const READING_HELP_PRESETS = {
  standard: ReadingHelp.parse({}),
  more: ReadingHelp.parse({
    audioInstructions: true,
    questionReadAloud: true,
    textSize: 'large',
    lineSpacing: 'wide',
    readingRuler: true,
    simpleWords: true,
  }),
} as const;

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

/** Conditions detected during a try (BB-70). Affected words are flagged low confidence, not errors. */
export const TryCondition = z.enum(['overlapping_voices', 'background_speech', 'low_volume']);
export type TryCondition = z.infer<typeof TryCondition>;

/** `needs_review` tries are not used for level movement until someone confirms them. */
export const TryReview = z.enum(['none', 'needs_review', 'confirmed']);
export type TryReview = z.infer<typeof TryReview>;

export const TryChecks = z.object({
  conditions: z.array(TryCondition),
  review: TryReview,
});
export type TryChecks = z.infer<typeof TryChecks>;

export const TryAnalysis = z.object({
  /** Absent on tries analysed before the environment checks existed. */
  checks: TryChecks.optional(),
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
