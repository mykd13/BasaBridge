/**
 * Deterministic story checks (docs/PLAN.md section 7). Owner: Jhade (BB-16).
 * Pure functions: no model calls, no learner data.
 */
import type { StoryQuestion } from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';

export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

/** Flesch-Kincaid grade level. Noisy on very short texts, so tiers use generous caps. */
export function readingGrade(text: string): number {
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim()).length || 1;
  const words = text.match(/[A-Za-z']+/g) ?? [];
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / Math.max(1, words.length)) - 15.59;
}

export function countWords(text: string): number {
  return (text.match(/[A-Za-z']+/g) ?? []).length;
}

const normalise = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/** Why a story or one of its questions failed. Codes are stable: tests and retry feedback use them. */
export type StoryFailureCode = 'too_short' | 'too_long' | 'too_hard' | 'too_few_questions';

export type QuestionFailureCode =
  | 'bad_shape'
  | 'options_not_distinct'
  | 'answer_out_of_range'
  | 'evidence_missing'
  | 'evidence_not_sentence'
  | 'vocab_word_missing'
  | 'duplicate_question';

export type CheckFailureCode = StoryFailureCode | QuestionFailureCode;

export interface CheckFailure {
  code: CheckFailureCode;
  /** Plain English with counts and limits only. Never repeats model or learner text. */
  message: string;
  /** Position in the raw question list. Absent for story-level failures. */
  questionIndex?: number;
}

export type CheckResult =
  | {
      ok: true;
      words: number;
      readingGrade: number;
      questions: StoryQuestion[];
      /** Questions that were left out. The story still passed. */
      dropped: CheckFailure[];
    }
  | { ok: false; failures: CheckFailure[] };

/** Raw question as returned by a model, before any trust. */
export interface RawQuestion {
  skill?: unknown;
  word?: unknown;
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  evidence?: unknown;
}

/** A story needs at least this many valid questions to be shown. */
export const MIN_QUESTIONS = 4;

const OPTION_COUNT = 4;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * Deterministic checks on a generated story: length range, reading grade cap, valid questions,
 * distinct options, evidence sentence present verbatim, vocabulary word present.
 * At least four valid questions must remain. Every failure is reported, not just the first.
 */
export function checkStory(text: string, rawQuestions: RawQuestion[], level: number): CheckResult {
  const tier = tierFor(level);
  const passage = text.trim();
  const failures: CheckFailure[] = [];

  const words = countWords(passage);
  if (words < tier.words.min || words > tier.words.max) {
    failures.push({
      code: words < tier.words.min ? 'too_short' : 'too_long',
      message: `The passage had ${words} words but must have ${tier.words.min}-${tier.words.max}.`,
    });
  }
  const grade = readingGrade(passage);
  if (grade > tier.maxReadingGrade) {
    failures.push({
      code: 'too_hard',
      message: `The passage was too hard (reading grade ${grade.toFixed(1)}, maximum ${tier.maxReadingGrade}).`,
    });
  }

  const np = normalise(passage);
  const kept: StoryQuestion[] = [];
  const dropped: CheckFailure[] = [];
  rawQuestions.forEach((q, index) => {
    const fail = (code: QuestionFailureCode, message: string) =>
      dropped.push({ code, message, questionIndex: index });
    const options = q.options;
    const skill = q.skill;
    const shapeOk =
      (skill === 'vocabulary' || skill === 'literal' || skill === 'inferential') &&
      isNonEmptyString(q.question) &&
      Array.isArray(options) &&
      options.length === OPTION_COUNT &&
      options.every(isNonEmptyString) &&
      Number.isInteger(q.answerIndex) &&
      typeof q.evidence === 'string' &&
      (skill !== 'vocabulary' || isNonEmptyString(q.word));
    if (!shapeOk) {
      fail('bad_shape', 'The question is missing a field or has the wrong number of options.');
      return;
    }
    const before = dropped.length;
    const opts = options as string[];
    if (new Set(opts.map(normalise)).size !== OPTION_COUNT) {
      fail('options_not_distinct', 'The question has options that repeat.');
    }
    const answerIndex = q.answerIndex as number;
    if (answerIndex < 0 || answerIndex >= OPTION_COUNT) {
      fail('answer_out_of_range', 'The answer does not point at one of the options.');
    }
    const evidence = q.evidence as string;
    if (!np.includes(normalise(evidence))) {
      fail('evidence_missing', 'The evidence is not in the passage word for word.');
    }
    if (skill === 'vocabulary' && !np.includes(normalise(String(q.word)))) {
      fail('vocab_word_missing', 'The vocabulary word is not in the passage.');
    }
    if (dropped.length > before) return;
    kept.push({
      skill: skill as StoryQuestion['skill'],
      word: skill === 'vocabulary' ? String(q.word).trim() : null,
      question: (q.question as string).trim(),
      options: opts.map((o) => o.trim()),
      answerIndex,
      evidence: evidence.trim(),
    });
  });

  if (kept.length < MIN_QUESTIONS) {
    failures.push({
      code: 'too_few_questions',
      message: `Only ${kept.length} valid questions; need at least ${MIN_QUESTIONS}.`,
    });
  }
  if (failures.length > 0) return { ok: false, failures: [...failures, ...dropped] };
  return { ok: true, words, readingGrade: grade, questions: kept, dropped };
}
