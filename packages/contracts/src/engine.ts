/**
 * Request and response shapes for the student engine routes (docs/engine-api.md, BB-36, BB-47, BB-49).
 * Added on top of the base contracts. Needs review from the owners on both sides.
 *
 * Nothing here carries a name, a username or audio (AGENTS.md rule 2). Answer keys never leave the
 * server: `PublicQuestion` has no correct answer and no evidence sentence.
 */
import { z } from 'zod';
import {
  Accommodation,
  ComprehensionSkill,
  Level,
  PlacementResult,
  QuestionType,
  SessionStatus,
} from './index';

/** A question as the learner sees it. The key and the evidence sentence stay on the server. */
export const PublicQuestion = z.object({
  id: z.string().uuid(),
  type: QuestionType,
  skill: ComprehensionSkill,
  question: z.string().min(1),
  /** order_events: the events in display order. The learner returns indexes in story order. */
  options: z.array(z.string().min(1)).min(3).max(6),
});
export type PublicQuestion = z.infer<typeof PublicQuestion>;

export const VoiceMode = z.enum(['voice', 'silent']);
export type VoiceMode = z.infer<typeof VoiceMode>;

/** What the learner can do next in a session. The server decides; the screen only follows it. */
export const SessionNext = z.enum(['read', 'read_or_continue', 'answer', 'new_story']);
export type SessionNext = z.infer<typeof SessionNext>;

export const TryView = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
  /** null for silent reads and for tries without speech analysis. */
  wordsRightShare: z.number().min(0).max(1).nullable(),
  /** True when the learner listened first (listen-then-read). Shown as "after listening". */
  supported: z.boolean(),
});
export type TryView = z.infer<typeof TryView>;

export const SessionResult = z.object({
  outcome: z.enum(['passed', 'not_passed', 'stopped_early']),
  wordsRightShare: z.number().min(0).max(1).nullable(),
  questionsCorrect: z.number().int().nonnegative(),
  questionsTotal: z.number().int().nonnegative(),
  levelBefore: Level,
  levelAfter: Level,
  moved: z.enum(['up', 'down', 'none']),
  focusSkill: ComprehensionSkill.nullable(),
  /** Level of the next story at the same difficulty rules (`new_story` keeps the session's level). */
  nextStoryLevel: Level,
  learn: z.object({ onResult: z.boolean() }),
  /** Silent reads give no words-right evidence, so they never move a learner up. */
  voiceEvidence: z.boolean(),
});
export type SessionResult = z.infer<typeof SessionResult>;

export const SessionView = z.object({
  id: z.string().uuid(),
  status: SessionStatus,
  next: SessionNext,
  level: Level,
  story: z.object({
    id: z.string().uuid(),
    title: z.string(),
    text: z.string(),
    words: z.number().int().positive(),
  }),
  voiceMode: VoiceMode,
  /** null means unlimited. */
  triesAllowed: z.number().int().positive().nullable(),
  triesUsed: z.number().int().nonnegative(),
  triesLeft: z.number().int().nonnegative().nullable(),
  countedTryId: z.string().uuid().nullable(),
  tries: z.array(TryView),
  /** Whether the screen may offer listen-then-read before the next try. */
  listenThenRead: z.boolean(),
  /** Empty until the session is answering. */
  questions: z.array(PublicQuestion),
  answeredQuestionIds: z.array(z.string().uuid()),
  /** Set once the session is done. */
  result: SessionResult.nullable(),
  /** The learner skipped placement and is asked again. */
  placementDue: z.boolean(),
});
export type SessionView = z.infer<typeof SessionView>;

// ---- requests ---------------------------------------------------------------

/** Start a read try. The browser sends a capture id or says it read silently. Never scores or audio. */
export const SubmitTryRequest = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('voice'),
    /** Id of the finished capture. The server looks up the analysis from the speech pipeline. */
    captureId: z.string().min(8).max(64),
    /** The learner heard the story read slowly first. The server checks it was allowed. */
    listened: z.boolean().default(false),
  }),
  z.object({ mode: z.literal('silent'), listened: z.boolean().default(false) }),
]);
export type SubmitTryRequest = z.infer<typeof SubmitTryRequest>;

export const SubmitAnswerRequest = z.object({
  questionId: z.string().uuid(),
  chosen: z.array(z.number().int().min(0)).min(1).max(6),
  responseMs: z.number().int().nonnegative(),
  accommodations: z.array(Accommodation).default([]),
});
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequest>;

export const AnswerFeedback = z.object({
  correct: z.boolean(),
  /** The correct option indexes. Shown after answering, with the evidence sentence. */
  correctIndexes: z.array(z.number().int().min(0)),
  evidence: z.string(),
  /** Show the small Learn link under this wrong answer (once per quiz, never in placement). */
  offerLearn: z.boolean(),
  /** Set when this was the last question and the session finished. */
  result: SessionResult.nullable(),
});
export type AnswerFeedback = z.infer<typeof AnswerFeedback>;

// ---- placement --------------------------------------------------------------

export const PlacementStatus = z.enum(['reading', 'answering', 'done']);
export type PlacementStatus = z.infer<typeof PlacementStatus>;

export const PlacementView = z.object({
  id: z.string().uuid(),
  status: PlacementStatus,
  voiceMode: VoiceMode,
  /** 1-based number of the story on screen and the most stories placement can show. */
  storyNumber: z.number().int().positive(),
  maxStories: z.number().int().positive(),
  story: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      text: z.string(),
      words: z.number().int().positive(),
    })
    .nullable(),
  /** Placement offers no help: always false. Screens read these, they do not decide. */
  supports: z.object({
    listenThenRead: z.literal(false),
    wordTap: z.literal(false),
    questionReadAloud: z.literal(false),
    learn: z.literal(false),
  }),
  questions: z.array(PublicQuestion),
  answeredQuestionIds: z.array(z.string().uuid()),
  /** The last voice recording failed once. The learner may record again before the story is skipped. */
  retryRead: z.boolean(),
  result: PlacementResult.nullable(),
  /** After a silent placement: once voice is approved, a short re-check is due. */
  voiceRecheckDue: z.boolean(),
});
export type PlacementView = z.infer<typeof PlacementView>;

export const PlacementReadRequest = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('voice'), captureId: z.string().min(8).max(64) }),
  /** The recording failed on the device or upload. The server retries once, then skips the story. */
  z.object({ mode: z.literal('voice_failed') }),
  z.object({ mode: z.literal('silent') }),
]);
export type PlacementReadRequest = z.infer<typeof PlacementReadRequest>;

/** Placement answers carry no accommodations: none are allowed. */
export const PlacementAnswerRequest = z.object({
  questionId: z.string().uuid(),
  chosen: z.array(z.number().int().min(0)).min(1).max(6),
  responseMs: z.number().int().nonnegative(),
});
export type PlacementAnswerRequest = z.infer<typeof PlacementAnswerRequest>;

export const PlacementAnswerAck = z.object({
  /** Placement does not tell the learner whether an answer was right. */
  accepted: z.literal(true),
  placement: PlacementView,
});
export type PlacementAnswerAck = z.infer<typeof PlacementAnswerAck>;

export const PlacementGate = z.object({
  /** True when the main course is locked until placement is done or skipped. */
  required: z.boolean(),
  state: z.enum(['none', 'in_progress', 'completed', 'skipped']),
  /** The learner may retake placement now (30 days after finishing). */
  canRetake: z.boolean(),
  /** After a skip or a silent placement the learner is asked again. */
  due: z.boolean(),
});
export type PlacementGate = z.infer<typeof PlacementGate>;

export const EngineErrorCode = z.enum([
  'unauthorized',
  'bad_request',
  'placement_required',
  'placement_done',
  'placement_not_found',
  'session_not_found',
  'session_wrong_state',
  'no_tries_left',
  'mic_not_allowed',
  'analysis_not_found',
  'try_not_completed',
  'no_completed_try',
  'question_not_found',
  'already_answered',
  'bad_choice',
  'accommodation_not_allowed',
  'no_story_available',
  'not_configured',
  'internal',
]);
export type EngineErrorCode = z.infer<typeof EngineErrorCode>;

export const EngineError = z.object({ error: EngineErrorCode });
export type EngineErrorBody = z.infer<typeof EngineError>;
