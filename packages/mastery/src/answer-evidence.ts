/**
 * Turns one stored answer into evidence for the ability model (docs/PLAN.md 6.1, ADR 0003).
 * Rushed answers and answers after a supported try count for less. Question read-aloud is
 * recorded and never changes the weight. Pure. Owner: Jhade (BB-19).
 */
import type {
  Accommodation,
  ComprehensionSkill,
  QuestionType,
  SubSkill,
} from '@basabridge/contracts';
import { evidenceWeight, guessFor, isRushed, itemDifficulty, type ItemEvidence } from './ability';

/**
 * One answer as stored in `answers`, joined with its question. Only answers to the questions of a
 * real story belong here. Learn practice answers must never be scored into level movement.
 */
export interface AnswerInput {
  answerId: string;
  questionId: string;
  /** questions.skill */
  skill: ComprehensionSkill;
  subskill?: SubSkill | null;
  type?: QuestionType | null;
  /** questions.difficulty. Null until calibrated (BB-45). */
  calibratedDifficulty?: number | null;
  correct: boolean;
  /** Null when no time was reported. Not treated as rushed. */
  responseMs: number | null;
  /** Words in the question and its options, for the rushed threshold. */
  wordsOnScreen: number;
  accommodations: readonly Accommodation[];
}

export interface ScoredAnswer {
  answerId: string;
  questionId: string;
  skill: ComprehensionSkill;
  correct: boolean;
  difficulty: number;
  guess: number;
  weight: number;
  rushed: boolean;
  supportedTry: boolean;
  questionReadAloud: boolean;
  /** Every accommodation on the answer, as stored (golden rule 12). */
  accommodations: readonly Accommodation[];
}

export function scoreAnswer(a: AnswerInput, storyLevel: number): ScoredAnswer {
  const rushed = a.responseMs != null && isRushed(a.responseMs, a.wordsOnScreen);
  const supportedTry = a.accommodations.includes('supported_try');
  return {
    answerId: a.answerId,
    questionId: a.questionId,
    skill: a.skill,
    correct: a.correct,
    difficulty: a.calibratedDifficulty ?? itemDifficulty(storyLevel, a.subskill ?? undefined),
    guess: guessFor(a.type ?? undefined),
    weight: evidenceWeight({ rushed, supportedTry }),
    rushed,
    supportedTry,
    questionReadAloud: a.accommodations.includes('question_read_aloud'),
    accommodations: [...a.accommodations],
  };
}

export function toItemEvidence(s: ScoredAnswer): ItemEvidence {
  return { difficulty: s.difficulty, guess: s.guess, correct: s.correct, weight: s.weight };
}
