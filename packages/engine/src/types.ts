/**
 * Domain records and the seams (ports) the engine talks through (BB-36, BB-47, BB-49).
 *
 * The engine is pure orchestration. It never touches the database, the story bank or the speech
 * pipeline directly: the app passes in implementations of these interfaces. packages/db is locked, so
 * the repository interfaces below describe the rows we need (see docs/engine-api.md) and the real
 * implementations come with the migrations. All reads go through the authorization layer (BB-10)
 * inside those implementations.
 */
import type {
  Accommodation,
  ComprehensionSkill,
  PlacementResult,
  QuestionType,
  SubSkill,
  TryAnalysis,
} from '@basabridge/contracts';
import type { SessionResult } from '@basabridge/contracts/engine';
import type { Posterior, StoryAnswers } from '@basabridge/mastery';

// ---- story bank -------------------------------------------------------------

/** The answer key. It never leaves the server. */
export type AnswerKey =
  | { kind: 'single'; index: number }
  | { kind: 'multi'; indexes: number[] }
  /** `order[i]` is the index of the option that happened i-th. */
  | { kind: 'order'; order: number[] };

export interface StoredQuestion {
  id: string;
  type: QuestionType;
  skill: ComprehensionSkill;
  subskill?: SubSkill;
  question: string;
  options: string[];
  key: AnswerKey;
  evidence: string;
  /** Calibrated difficulty on the ability scale. Missing until BB-45. */
  difficulty?: number | null;
}

export interface StoredStory {
  id: string;
  level: number;
  title: string;
  text: string;
  words: number;
  questions: StoredQuestion[];
}

/** Seam for the story bank (BB-18 for the main course, BB-48 for placement). */
export interface StoryBank {
  /** A checked story at `level`, preferring extra questions on `focus`. null when the bank has none. */
  pick(input: {
    level: number;
    focus: ComprehensionSkill | null;
    excludeStoryIds: string[];
  }): Promise<StoredStory | null>;
  get(id: string): Promise<StoredStory | null>;
}

// ---- speech -----------------------------------------------------------------

/**
 * Seam for the speech pipeline (BB-24 to BB-26). The browser only ever sends a capture id. The
 * server asks the pipeline for the analysis of that capture, once. The browser never sends scores.
 * Returns null when the capture is unknown, not owned by this learner, or already used.
 */
export interface AnalysisSource {
  take(learnerId: string, captureId: string): Promise<TryAnalysis | null>;
}

// ---- learner ----------------------------------------------------------------

export interface LearnerProgress {
  level: number;
  /** Stories passed at the current level. Reset when the level moves. */
  passedStories: number;
  /** Words right on the last counted voice tries at this level, newest last (at most five). */
  recentWordsRight: number[];
  /** Belief about ability. null until placement or the first finished story. */
  posterior: Posterior | null;
  /** The last finished stories (at most twenty), oldest first, for the focus skill. */
  history: StoryAnswers[];
}

export type PlacementGateState = 'none' | 'in_progress' | 'completed' | 'skipped';

export interface LearnerProfile {
  id: string;
  grade: number | null;
  /**
   * Decided by the server from the age gate and guardian approval (BB-8). false for an under-13
   * learner without approval. The browser never sets this.
   */
  micAllowed: boolean;
  /** The learner's own listen-then-read setting. */
  listenThenReadEnabled: boolean;
  progress: LearnerProgress;
  placement: {
    state: PlacementGateState;
    finishedAt: Date | null;
    result: PlacementResult | null;
  };
}

/** Repository interface for `learners` plus the progress and placement columns (see docs/engine-api.md). */
export interface LearnerRepository {
  getProfile(learnerId: string): Promise<LearnerProfile | null>;
  saveProgress(learnerId: string, progress: LearnerProgress): Promise<void>;
  /** Writes the placement state and, when given, the new progress, in one transaction. */
  savePlacement(
    learnerId: string,
    placement: LearnerProfile['placement'],
    progress: LearnerProgress | null,
  ): Promise<void>;
}

// ---- reading sessions -------------------------------------------------------

export interface TryEntry {
  id: string;
  completed: boolean;
  wordsRightShare: number | null;
  wordsPerMinute: number;
  supported: boolean;
  /** Environment checks asked for review: the try is not used for level movement. */
  needsReview: boolean;
  createdAt: Date;
}

export interface AnswerEntry {
  questionId: string;
  chosen: number[];
  correct: boolean;
  responseMs: number;
  rushed: boolean;
  accommodations: Accommodation[];
  weight: number;
}

export interface SessionRecord {
  id: string;
  learnerId: string;
  storyId: string;
  level: number;
  voiceMode: 'voice' | 'silent';
  triesAllowed: number | null;
  tries: TryEntry[];
  countedTryId: string | null;
  status: 'reading' | 'answering' | 'done';
  answers: AnswerEntry[];
  /** Small Learn links already shown in this quiz. */
  inlineOffersShown: number;
  result: SessionResult | null;
  /** Row version for the concurrency guard. 0 when created. */
  version: number;
  createdAt: Date;
}

/**
 * Repository interface for `reading_sessions`, `tries` and `answers`. A session is saved as one
 * unit. `save` must be atomic and must compare `record.version` with the stored version: when they
 * differ it throws `EngineError('conflict')` and writes nothing, otherwise it stores the record with
 * `version + 1` (for example `UPDATE ... WHERE id = $1 AND version = $2`). That stops two tabs from
 * counting a try or finishing a session twice.
 */
export interface SessionRepository {
  get(sessionId: string): Promise<SessionRecord | null>;
  /** The learner's one unfinished session, if any. Used to resume. */
  findActive(learnerId: string): Promise<SessionRecord | null>;
  create(record: SessionRecord): Promise<void>;
  save(record: SessionRecord): Promise<void>;
  /** Story ids of the learner's latest sessions, newest first, so stories do not repeat. */
  recentStoryIds(learnerId: string, limit: number): Promise<string[]>;
}

// ---- placement --------------------------------------------------------------

export interface PlacementStoryRecord {
  storyId: string;
  level: number;
  readStatus: 'pending' | 'scored' | 'skipped' | 'silent';
  /** Failed voice recordings on this story so far. */
  failures: number;
  wordsRightShare: number | null;
  answers: AnswerEntry[];
}

export interface PlacementRecord {
  id: string;
  learnerId: string;
  startLevel: number;
  voiceMode: 'voice' | 'silent';
  status: 'reading' | 'answering' | 'done';
  stories: PlacementStoryRecord[];
  result: PlacementResult | null;
  /** Row version for the concurrency guard. Same rule as `SessionRecord.version`. */
  version: number;
  createdAt: Date;
  finishedAt: Date | null;
}

/**
 * Repository interface for `placement_sessions` (the table already exists in packages/db).
 * `save` has the same version check as the session repository and throws `conflict` on a stale copy.
 */
export interface PlacementRepository {
  get(id: string): Promise<PlacementRecord | null>;
  findInProgress(learnerId: string): Promise<PlacementRecord | null>;
  create(record: PlacementRecord): Promise<void>;
  save(record: PlacementRecord): Promise<void>;
}

// ---- wiring -----------------------------------------------------------------

export interface EngineDeps {
  learners: LearnerRepository;
  sessions: SessionRepository;
  placements: PlacementRepository;
  stories: StoryBank;
  placementStories: StoryBank;
  analyses: AnalysisSource;
  now(): Date;
  newId(): string;
}
