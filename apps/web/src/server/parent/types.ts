/**
 * What each parent screen (F2 to F6) shows. These are view shapes for the web app only.
 * BB-10 will return the real rows; map them to these in loaders.ts. They carry counts, levels
 * and word-level text. They never carry audio (AGENTS.md rule 3).
 * Dates are ISO strings so the shapes survive the server to client boundary.
 */
import type {
  AbilityConfidence,
  ComprehensionSkill,
  Decision,
  HomeActivity,
  Skill,
} from '@basabridge/contracts';

/** A section a student can share. Each is switched on by the student (BB-10). */
export const SHARE_SECTIONS = ['progress', 'readings', 'levels', 'decisions'] as const;
export type ShareSection = (typeof SHARE_SECTIONS)[number];

/** The state of one screen. Only `ready` carries data. */
export type ScreenState<T> =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'not-shared' }
  | { kind: 'not-wired' }
  | { kind: 'error' }
  | { kind: 'ready'; data: T };

/** The line under the page title: "Grade 3 · Level 24 of 100 · 12 readings". */
export interface LearnerSummary {
  grade: number | null;
  level: number;
  readings: number;
  sharedSince: string;
}

// ---- F2 progress -------------------------------------------------------------

export type SkillMeasure =
  | { kind: 'words'; right: number; total: number }
  | { kind: 'questions'; right: number; total: number }
  | { kind: 'pace'; wordsPerMinute: number };

export interface SkillRow {
  skill: Skill;
  measure: SkillMeasure;
  confidence: AbilityConfidence;
  /** Change since the last reading, in the measure's own unit. null when there is none. */
  change: number | null;
}

/** Same kinds as the pattern aggregation in packages/speech (BB-27). */
export type PatternKind =
  'dropped_ending' | 'letter_pattern' | 'repeated_substitution' | 'missing_pause';

export interface PatternRow {
  kind: PatternKind;
  /** An ending, letters, a word pair or "full_stop". Words only. */
  key: string;
  count: number;
  tries: number;
  confidence: 'low' | 'medium' | 'high';
}

/** Teacher notes in the BB-20 shape (PR #13). The wording is for the parent. */
export interface ParentNotes {
  whatHappened: string;
  whyFocus: string;
  homeActivity: HomeActivity;
  source: 'ai' | 'standard';
}

export interface ProgressView {
  summary: LearnerSummary;
  level: {
    level: number;
    /** Stories passed at this level so far. */
    passes: number;
  };
  /** Mean tries over the most recent stories. null before any story. */
  averageTries: { value: number; stories: number } | null;
  skills: SkillRow[];
  patterns: PatternRow[];
  plan: {
    focus: ComprehensionSkill | null;
    /** Lowest measured comprehension skill, as the rule counted it. */
    focusEvidence: { right: number; total: number } | null;
    lastReading: { correct: number; total: number; wordsRightShare: number | null } | null;
  };
  /** null until BB-20 lands. The screen then shows the standard home activity. */
  notes: ParentNotes | null;
}

// ---- F3 readings -------------------------------------------------------------

export interface TryRow {
  number: number;
  completed: boolean;
  wordsRight: number;
  wordsTotal: number;
  wordsPerMinute: number;
  counted: boolean;
}

export interface WordToCheck {
  expected: string;
  heard: string | null;
  confidence: 'high' | 'medium' | 'low';
  markedMisheard: boolean;
}

export interface QuestionRow {
  number: number;
  text: string;
  skill: ComprehensionSkill;
  correct: boolean;
  /** Shown for a missed question. */
  chosen: string | null;
  answer: string | null;
  evidence: string;
}

export interface ReadingRow {
  id: string;
  title: string;
  readAt: string;
  level: number;
  questionsCorrect: number;
  questionsTotal: number;
  /** null when no voice was available. */
  wordsRightShare: number | null;
  tries: TryRow[];
  wordsToCheck: WordToCheck[];
  /** Written by the AI Teacher, or standard wording. null when none exists yet. */
  analysis: { text: string; source: 'ai' | 'standard'; differences: number } | null;
  questions: QuestionRow[];
}

export interface ReadingsView {
  summary: LearnerSummary;
  readings: ReadingRow[];
}

// ---- F4 levels ---------------------------------------------------------------

export type LevelChangeReason = 'placement' | 'moved_up' | 'moved_down';

export interface LevelChange {
  id: string;
  at: string;
  from: number | null;
  to: number;
  reason: LevelChangeReason;
}

export interface LevelsView {
  summary: LearnerSummary;
  history: LevelChange[];
}

// ---- F5 decisions ------------------------------------------------------------

export interface DecisionRow {
  id: string;
  at: string;
  decision: Decision;
  /** Title of the story the decision rests on, when there is one. */
  basedOn: string | null;
}

export interface DecisionsView {
  summary: LearnerSummary;
  decisions: DecisionRow[];
}

// ---- F6 privacy --------------------------------------------------------------

export interface LinkedChild {
  id: string;
  label: string;
  linkedAt: string;
  sharing: ShareSection[];
  microphone: 'given_by_parent' | 'not_needed' | 'pending';
}

export interface PrivacyView {
  children: LinkedChild[];
}

/** The state a route's loading.tsx passes in. */
export const LOADING: ScreenState<never> = { kind: 'loading' };
