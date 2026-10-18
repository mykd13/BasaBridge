/**
 * Deterministic story checks (docs/PLAN.md section 7). Owner: Jhade (BB-16).
 * Pure functions: no model calls, no learner data.
 */
import type { StoryQuestion } from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';
import { countIdioms } from './vocab/idioms';
import { vocabularyProfile } from './vocab/profile';

export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

const ABBREVIATION = /\b(?:Mr|Mrs|Ms|Dr|St)\.$/;

/**
 * Splits text into sentences. A closing quote stays with its sentence, and a quote that is
 * followed by a lowercase word ("Come here!" she said.) does not end the sentence.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const end = /[.!?]+["'”’)\]]*(?=\s|$)/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = end.exec(text))) {
    const stop = m.index + m[0].length;
    if (ABBREVIATION.test(text.slice(0, stop))) continue;
    const next = text.slice(stop).match(/^\s*(\S)/)?.[1];
    if (/["'”’]/.test(m[0]) && next && /[a-z]/.test(next)) continue;
    sentences.push(text.slice(start, stop).trim());
    start = stop;
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences.filter(Boolean);
}

/** Flesch-Kincaid grade level. Noisy on very short texts, so tiers use generous caps. */
export function readingGrade(text: string): number {
  const sentences = splitSentences(text).length || 1;
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
export type StoryFailureCode =
  | 'too_short'
  | 'too_long'
  | 'too_hard'
  | 'too_many_new_words'
  | 'idiom_not_allowed'
  | 'too_few_questions';

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
 * Evidence must be one whole sentence of the passage, or a run of adjacent sentences.
 * Returns 'ok', 'not_sentence' (the text is in the passage but is a fragment) or 'missing'.
 */
function matchEvidence(
  sentences: string[],
  normalisedPassage: string,
  evidence: string,
): 'ok' | 'not_sentence' | 'missing' {
  const target = normalise(evidence);
  if (target === '') return 'missing';
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i; j < sentences.length; j++) {
      if (sentences.slice(i, j + 1).join(' ') === target) return 'ok';
    }
  }
  return normalisedPassage.includes(target) ? 'not_sentence' : 'missing';
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The word on word boundaries, allowing -s, -es, -ed, -d, -ing and the usual spelling changes. */
function containsWord(normalisedPassage: string, word: string): boolean {
  const w = normalise(word);
  if (w === '') return false;
  const forms = [`${escapeRegExp(w)}(?:s|es|ed|d|ing)?`];
  const last = w.slice(-1);
  if (last === 'e') forms.push(`${escapeRegExp(w.slice(0, -1))}ing`);
  if (last === 'y') forms.push(`${escapeRegExp(w.slice(0, -1))}(?:ies|ied)`);
  if (/[aeiou][^aeiou]$/.test(w)) forms.push(`${escapeRegExp(w)}${escapeRegExp(last)}(?:ed|ing)`);
  return new RegExp(`(?<![a-z])(?:${forms.join('|')})(?![a-z])`).test(normalisedPassage);
}

/**
 * Deterministic checks on a generated story: length range, reading grade cap, vocabulary limits
 * and no idioms where the tier does not allow them (BB-72), valid questions, distinct options, evidence is a whole sentence (or adjacent sentences) of the passage,
 * vocabulary word present on word boundaries, no repeated questions.
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

  const vocab = vocabularyProfile(passage, tier.vocabulary.maxRank);
  const { minKnownShare, maxNewWords } = tier.vocabulary;
  if (vocab.knownShare < minKnownShare || vocab.newWords.length > maxNewWords) {
    const known = Math.floor(vocab.knownShare * 100);
    failures.push({
      code: 'too_many_new_words',
      message: `The passage had ${vocab.newWords.length} new words and ${known}% known words, but may have at most ${maxNewWords} new words and needs at least ${Math.round(minKnownShare * 100)}% known words. Use simpler, more common words.`,
    });
  }
  const idioms = tier.idiomsAllowed ? 0 : countIdioms(passage);
  if (idioms > 0) {
    failures.push({
      code: 'idiom_not_allowed',
      message: `The passage used ${idioms} idioms, which are not allowed at this level. Say what you mean in plain words.`,
    });
  }

  const np = normalise(passage);
  const sentences = splitSentences(passage).map(normalise);
  const seenQuestions = new Set<string>();
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
    const questionKey = normalise(q.question as string);
    if (seenQuestions.has(questionKey)) {
      fail('duplicate_question', 'The question repeats an earlier question.');
    }
    seenQuestions.add(questionKey);
    const opts = options as string[];
    if (new Set(opts.map(normalise)).size !== OPTION_COUNT) {
      fail('options_not_distinct', 'The question has options that repeat.');
    }
    const answerIndex = q.answerIndex as number;
    if (answerIndex < 0 || answerIndex >= OPTION_COUNT) {
      fail('answer_out_of_range', 'The answer does not point at one of the options.');
    }
    const evidence = q.evidence as string;
    const evidenceMatch = matchEvidence(sentences, np, evidence);
    if (evidenceMatch === 'missing') {
      fail('evidence_missing', 'The evidence is not in the passage word for word.');
    } else if (evidenceMatch === 'not_sentence') {
      fail('evidence_not_sentence', 'The evidence must be a whole sentence from the passage.');
    }
    if (skill === 'vocabulary' && !containsWord(np, String(q.word))) {
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
