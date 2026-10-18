/**
 * Learn practice and check items (docs/PLAN.md section 6.3, BB-54). Each item is a tiny passage
 * with one tagged question. Practice items also carry a hint and an explanation. Items go through
 * the same per-question checks as stories, then the independent verifier.
 * Pure functions: no model calls, no learner data.
 */
import {
  QuestionTags,
  SUBSKILL_PARENT,
  type StoryQuestion,
  type SubSkill,
} from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';
import {
  checkQuestions,
  countWords,
  normaliseText,
  readingGrade,
  type CheckFailure,
  type CheckFailureCode,
  type RawQuestion,
} from '../checks';

/** Guided practice has hints and feedback. A check has fresh questions and no help. */
export type PracticeKind = 'practice' | 'check';

export interface PracticeItem {
  kind: PracticeKind;
  level: number;
  subskill: SubSkill;
  passage: string;
  question: StoryQuestion;
  tags: QuestionTags;
  /** Practice only: a nudge toward the clue that does not give the answer away. */
  hint: string | null;
  /** Practice only: why the answer is right. The clue is `question.evidence`, highlighted in the passage. */
  explanation: string | null;
}

/** Limits for practice items. Pipeline settings, not level rules: the reading grade comes from the tier. */
export const PRACTICE_ITEM_LIMITS = {
  /** A tiny passage: a few sentences. */
  words: { min: 15, max: 80 },
  hintMaxWords: 20,
  explanationMaxWords: 30,
} as const;

/** What one practice item must be. */
export interface PracticeSpec {
  kind: PracticeKind;
  level: number;
  subskill: SubSkill;
}

/** A previous item, so a check item never repeats practice. */
export interface SeenItem {
  passage: string;
  question: string;
}

/** Raw item as returned by a model, before any trust. */
export interface RawPracticeItem {
  passage?: unknown;
  question?: RawQuestion & { subskill?: unknown; distractors?: unknown };
  hint?: unknown;
  explanation?: unknown;
}

export interface PracticeBatchResult {
  items: PracticeItem[];
  /** Why items were left out. `questionIndex` is the item's position in the batch. */
  dropped: CheckFailure[];
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * Checks every item in a batch and keeps the good ones. An item is dropped for a passage outside the
 * word range or over the tier's reading grade, a failed question check, tags that do not match the
 * lesson's sub-skill or answer, a missing or giveaway hint, a missing or long explanation, or a
 * passage or question that repeats one in `avoid` or earlier in the batch.
 */
export function checkPracticeBatch(
  raw: unknown,
  spec: PracticeSpec,
  avoid: readonly SeenItem[] = [],
): PracticeBatchResult {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];

  const seenPassages = new Set(avoid.map((a) => normaliseText(a.passage)));
  const seenQuestions = new Set(avoid.map((a) => normaliseText(a.question)));
  const items: PracticeItem[] = [];
  const dropped: CheckFailure[] = [];

  list.forEach((entry, index) => {
    const failures: CheckFailure[] = [];
    const fail = (code: CheckFailureCode, message: string) =>
      void failures.push({ code, message, questionIndex: index });
    const result = checkItem(entry as RawPracticeItem, spec, fail);
    if (result && failures.length === 0) {
      const passageKey = normaliseText(result.passage);
      const questionKey = normaliseText(result.question.question);
      if (seenPassages.has(passageKey) || seenQuestions.has(questionKey)) {
        fail('repeats_practice', 'The item repeats a passage or question that was already used.');
      } else {
        seenPassages.add(passageKey);
        seenQuestions.add(questionKey);
        items.push(result);
      }
    }
    dropped.push(...failures);
  });

  return { items, dropped };
}

function checkItem(
  raw: RawPracticeItem,
  spec: PracticeSpec,
  fail: (code: CheckFailureCode, message: string) => void,
): PracticeItem | null {
  if (!raw || typeof raw !== 'object' || !isNonEmptyString(raw.passage) || !raw.question) {
    fail('bad_item', 'The item needs a passage and one question.');
    return null;
  }
  const passage = raw.passage.trim();
  let failed = false;
  const check = (code: CheckFailureCode, message: string) => {
    failed = true;
    fail(code, message);
  };

  const words = countWords(passage);
  const { min, max } = PRACTICE_ITEM_LIMITS.words;
  if (words < min || words > max) {
    check(
      words < min ? 'too_short' : 'too_long',
      `The passage had ${words} words but must have ${min}-${max}.`,
    );
  }
  const cap = tierFor(spec.level).maxReadingGrade;
  const grade = readingGrade(passage);
  if (grade > cap) {
    check(
      'too_hard',
      `The passage was too hard (reading grade ${grade.toFixed(1)}, maximum ${cap}).`,
    );
  }

  const { kept, dropped } = checkQuestions(passage, [raw.question]);
  for (const d of dropped) check(d.code, d.message);
  const question = kept[0];

  const q = raw.question;
  if (q.subskill !== spec.subskill || q.skill !== SUBSKILL_PARENT[spec.subskill]) {
    check('wrong_subskill', `The question must practise ${spec.subskill.replace(/_/g, ' ')}.`);
  }
  const tags = QuestionTags.safeParse({ subskill: q.subskill, distractors: q.distractors });
  const answerIndex = q.answerIndex;
  if (!tags.success || tags.data.distractors.some((d, i) => (d === null) !== (i === answerIndex))) {
    check('bad_tags', 'Each wrong option needs a distractor type, and only the answer is null.');
  }

  let hint: string | null = null;
  let explanation: string | null = null;
  if (spec.kind === 'practice') {
    if (!isNonEmptyString(raw.hint) || countWords(raw.hint) > PRACTICE_ITEM_LIMITS.hintMaxWords) {
      check(
        'bad_hint',
        `The hint must be one sentence of at most ${PRACTICE_ITEM_LIMITS.hintMaxWords} words.`,
      );
    } else {
      hint = raw.hint.trim();
      const answer = question?.options[question.answerIndex];
      if (answer && normaliseText(hint).includes(normaliseText(answer))) {
        check('hint_gives_answer', 'The hint must not contain the answer.');
      }
    }
    if (
      !isNonEmptyString(raw.explanation) ||
      countWords(raw.explanation) > PRACTICE_ITEM_LIMITS.explanationMaxWords
    ) {
      check(
        'bad_explanation',
        `The explanation must be at most ${PRACTICE_ITEM_LIMITS.explanationMaxWords} words.`,
      );
    } else {
      explanation = raw.explanation.trim();
    }
  }

  if (failed || !question || !tags.success) return null;
  return {
    kind: spec.kind,
    level: spec.level,
    subskill: spec.subskill,
    passage,
    question,
    tags: tags.data,
    hint,
    explanation,
  };
}
