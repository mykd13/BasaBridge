/**
 * Deterministic story checks (docs/PLAN.md section 7). Owner: Jhade (BB-16).
 * Pure functions: no model calls, no learner data.
 */
import {
  ChooseAllQuestion,
  OrderEventsQuestion,
  QuestionTags,
  SUBSKILL_PARENT,
  SubSkill,
  type StoryQuestion,
} from '@basabridge/contracts';
import { allowsHardQuestion, tierFor } from '@basabridge/levels';

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
  'too_short' | 'too_long' | 'too_hard' | 'too_few_questions' | 'no_hard_question';

export type QuestionFailureCode =
  | 'bad_shape'
  | 'options_not_distinct'
  | 'answer_out_of_range'
  | 'evidence_missing'
  | 'evidence_not_sentence'
  | 'vocab_word_missing'
  | 'duplicate_question'
  | 'missing_tags'
  | 'bad_subskill'
  | 'subskill_mismatch'
  | 'bad_distractors'
  | 'type_not_allowed'
  | 'bad_choose_all_answers'
  | 'events_not_distinct';

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
      /** Multiple-choice questions that passed. */
      questions: StoryQuestion[];
      /** Tags for each entry in `questions`, same order. null when the question had none. */
      tags: (QuestionTags | null)[];
      /** Choose-all and order-the-events questions that passed. */
      hardQuestions: HardQuestion[];
      /** Questions that were left out. The story still passed. */
      dropped: CheckFailure[];
    }
  | { ok: false; failures: CheckFailure[] };

export type HardQuestion = ChooseAllQuestion | OrderEventsQuestion;

/** Raw question as returned by a model, before any trust. */
export interface RawQuestion {
  /** multiple_choice when absent. */
  type?: unknown;
  skill?: unknown;
  word?: unknown;
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  evidence?: unknown;
  subskill?: unknown;
  distractors?: unknown;
  /** choose_all only. */
  answerIndexes?: unknown;
  /** order_events only, in the correct order. */
  events?: unknown;
}

/**
 * Rules that depend on the prompt asking for them. Both stay off until the story prompt produces
 * tags (BB-43) and hard question types (BB-44), so turning them on is one change in the caller.
 * Tags and hard questions that are present are always checked.
 */
export interface CheckOptions {
  /** Every multiple-choice question must carry a sub-skill and distractor tags. */
  requireTags?: boolean;
  /** From the level in `QUESTION_RULE`, at least one choose-all or order-the-events question. */
  requireHardQuestion?: boolean;
}

/**
 * A story needs at least this many valid multiple-choice questions to be shown. Hard question types
 * do not count yet, because the `Story` contract holds only multiple-choice questions.
 */
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
 * Checks the optional tags on a multiple-choice question: a known sub-skill whose parent is the
 * question's skill, and one distractor entry per option with exactly one null, at the answer.
 * Returns the tags, null when the question has none, or the failure.
 */
function checkTags(
  q: RawQuestion,
  skill: StoryQuestion['skill'],
  answerIndex: number,
  requireTags: boolean,
): { tags: QuestionTags | null } | { code: QuestionFailureCode; message: string } {
  if (q.subskill === undefined && q.distractors === undefined) {
    if (requireTags) {
      return { code: 'missing_tags', message: 'The question has no sub-skill or distractor tags.' };
    }
    return { tags: null };
  }
  const subskill = SubSkill.safeParse(q.subskill);
  if (!subskill.success) {
    return { code: 'bad_subskill', message: 'The sub-skill is not one of the allowed values.' };
  }
  if (SUBSKILL_PARENT[subskill.data] !== skill) {
    return {
      code: 'subskill_mismatch',
      message: 'The sub-skill does not match the question skill.',
    };
  }
  const distractors = QuestionTags.shape.distractors.safeParse(q.distractors);
  const valid =
    distractors.success &&
    distractors.data.filter((d) => d === null).length === 1 &&
    distractors.data[answerIndex] === null;
  if (!valid) {
    return {
      code: 'bad_distractors',
      message:
        'The distractor tags need one entry per option, with null only for the correct option.',
    };
  }
  return { tags: { subskill: subskill.data, distractors: distractors.data } };
}

/**
 * Deterministic checks on a generated story: length range, reading grade cap, valid questions,
 * distinct options, evidence is a whole sentence (or adjacent sentences) of the passage,
 * vocabulary word present on word boundaries, no repeated questions, question tags, and the rules
 * for choose-all and order-the-events questions.
 * At least four valid multiple-choice questions must remain. Every failure is reported, not just
 * the first.
 */
export function checkStory(
  text: string,
  rawQuestions: RawQuestion[],
  level: number,
  options: CheckOptions = {},
): CheckResult {
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
  const sentences = splitSentences(passage).map(normalise);
  const hardAllowed = allowsHardQuestion(level);
  const seenQuestions = new Set<string>();
  const kept: StoryQuestion[] = [];
  const tags: (QuestionTags | null)[] = [];
  const hardQuestions: HardQuestion[] = [];
  const dropped: CheckFailure[] = [];

  rawQuestions.forEach((q, index) => {
    const fail = (code: QuestionFailureCode, message: string) =>
      dropped.push({ code, message, questionIndex: index });
    const badShape = () =>
      fail('bad_shape', 'The question is missing a field or has the wrong number of options.');
    const type = q.type ?? 'multiple_choice';
    if (type !== 'multiple_choice' && type !== 'choose_all' && type !== 'order_events') {
      badShape();
      return;
    }
    if (type !== 'multiple_choice' && !hardAllowed) {
      fail('type_not_allowed', 'Stories at this level use multiple-choice questions only.');
      return;
    }
    const question = q.question;
    const evidence = q.evidence;
    if (!isNonEmptyString(question) || typeof evidence !== 'string') {
      badShape();
      return;
    }
    const events = OrderEventsQuestion.shape.events.safeParse(q.events);
    const chooseOptions = ChooseAllQuestion.shape.options.safeParse(q.options);
    const chooseAnswers = ChooseAllQuestion.shape.answerIndexes.safeParse(q.answerIndexes);
    const opts = q.options;
    const skill = q.skill;
    const shapeOk =
      type === 'order_events'
        ? events.success
        : type === 'choose_all'
          ? chooseOptions.success && chooseAnswers.success
          : (skill === 'vocabulary' || skill === 'literal' || skill === 'inferential') &&
            Array.isArray(opts) &&
            opts.length === OPTION_COUNT &&
            opts.every(isNonEmptyString) &&
            Number.isInteger(q.answerIndex) &&
            (skill !== 'vocabulary' || isNonEmptyString(q.word));
    if (!shapeOk) {
      badShape();
      return;
    }

    const before = dropped.length;
    const questionKey = normalise(question);
    if (seenQuestions.has(questionKey)) {
      fail('duplicate_question', 'The question repeats an earlier question.');
    }
    seenQuestions.add(questionKey);
    const checkEvidence = () => {
      const evidenceMatch = matchEvidence(sentences, np, evidence);
      if (evidenceMatch === 'missing') {
        fail('evidence_missing', 'The evidence is not in the passage word for word.');
      } else if (evidenceMatch === 'not_sentence') {
        fail('evidence_not_sentence', 'The evidence must be a whole sentence from the passage.');
      }
    };

    if (type === 'order_events' && events.success) {
      if (q.subskill !== 'sequence') {
        fail('subskill_mismatch', 'An order-the-events question must have the sequence sub-skill.');
      }
      if (new Set(events.data.map(normalise)).size !== events.data.length) {
        fail('events_not_distinct', 'The events repeat, so there is more than one right order.');
      }
      checkEvidence();
      if (dropped.length > before) return;
      hardQuestions.push({
        type: 'order_events',
        subskill: 'sequence',
        question: question.trim(),
        events: events.data.map((e) => e.trim()),
        evidence: evidence.trim(),
      });
      return;
    }

    if (type === 'choose_all' && chooseOptions.success && chooseAnswers.success) {
      const choices = chooseOptions.data;
      const answers = chooseAnswers.data;
      const subskill = SubSkill.safeParse(q.subskill);
      if (!subskill.success) {
        fail('bad_subskill', 'The sub-skill is not one of the allowed values.');
      }
      if (new Set(choices.map(normalise)).size !== choices.length) {
        fail('options_not_distinct', 'The question has options that repeat.');
      }
      if (answers.some((a) => a >= choices.length)) {
        fail('answer_out_of_range', 'An answer does not point at one of the options.');
      } else if (new Set(answers).size !== answers.length || answers.length === choices.length) {
        fail(
          'bad_choose_all_answers',
          'The answers must not repeat, and at least one option must be wrong.',
        );
      }
      checkEvidence();
      if (dropped.length > before || !subskill.success) return;
      hardQuestions.push({
        type: 'choose_all',
        subskill: subskill.data,
        question: question.trim(),
        options: choices.map((o) => o.trim()),
        answerIndexes: [...answers].sort((a, b) => a - b),
        evidence: evidence.trim(),
      });
      return;
    }

    const mcOptions = opts as string[];
    const mcSkill = skill as StoryQuestion['skill'];
    if (new Set(mcOptions.map(normalise)).size !== OPTION_COUNT) {
      fail('options_not_distinct', 'The question has options that repeat.');
    }
    const answerIndex = q.answerIndex as number;
    const answerOk = answerIndex >= 0 && answerIndex < OPTION_COUNT;
    if (!answerOk) {
      fail('answer_out_of_range', 'The answer does not point at one of the options.');
    }
    checkEvidence();
    if (mcSkill === 'vocabulary' && !containsWord(np, String(q.word))) {
      fail('vocab_word_missing', 'The vocabulary word is not in the passage.');
    }
    const tagged = answerOk
      ? checkTags(q, mcSkill, answerIndex, options.requireTags === true)
      : null;
    if (tagged && 'code' in tagged) fail(tagged.code, tagged.message);
    if (dropped.length > before || !tagged || 'code' in tagged) return;
    kept.push({
      skill: mcSkill,
      word: mcSkill === 'vocabulary' ? String(q.word).trim() : null,
      question: question.trim(),
      options: mcOptions.map((o) => o.trim()),
      answerIndex,
      evidence: evidence.trim(),
    });
    tags.push(tagged.tags);
  });

  if (kept.length < MIN_QUESTIONS) {
    failures.push({
      code: 'too_few_questions',
      message: `Only ${kept.length} valid questions; need at least ${MIN_QUESTIONS}.`,
    });
  }
  if (options.requireHardQuestion && hardAllowed && hardQuestions.length === 0) {
    failures.push({
      code: 'no_hard_question',
      message: 'Stories at this level need at least one choose-all or order-the-events question.',
    });
  }
  if (failures.length > 0) return { ok: false, failures: [...failures, ...dropped] };
  return { ok: true, words, readingGrade: grade, questions: kept, tags, hardQuestions, dropped };
}
