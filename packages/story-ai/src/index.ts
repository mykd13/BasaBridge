/**
 * Story generation with checks (docs/PLAN.md section 7). Owner: Jhade (BB-15 to BB-18).
 * Seed: the deterministic checks ported from the early prototype. Generation and the verifier are stubs.
 */
import type { Story, StoryQuestion } from '@basabridge/contracts';
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

/** Lowercase, straight quotes, single spaces. Shared with the eval gold-set checks. */
export const normalise = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

export type CheckResult =
  | { ok: true; words: number; readingGrade: number; questions: StoryQuestion[]; dropped: number }
  | { ok: false; reason: string };

/** Raw question as returned by a model, before any trust. */
export interface RawQuestion {
  skill?: unknown;
  word?: unknown;
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  evidence?: unknown;
}

/**
 * Deterministic checks on a generated story: length range, reading grade cap, valid questions,
 * distinct options, evidence sentence present verbatim, vocabulary word present.
 * At least four valid questions must remain.
 */
export function checkStory(text: string, rawQuestions: RawQuestion[], level: number): CheckResult {
  const tier = tierFor(level);
  const passage = text.trim();
  const words = countWords(passage);
  if (words < tier.words.min || words > tier.words.max) {
    return {
      ok: false,
      reason: `The passage had ${words} words but must have ${tier.words.min}-${tier.words.max}.`,
    };
  }
  const grade = readingGrade(passage);
  if (grade > tier.maxReadingGrade) {
    return {
      ok: false,
      reason: `The passage was too hard (reading grade ${grade.toFixed(1)}, maximum ${tier.maxReadingGrade}).`,
    };
  }
  const np = normalise(passage);
  const kept: StoryQuestion[] = [];
  for (const q of rawQuestions) {
    const skill = q.skill;
    const options = q.options;
    const valid =
      (skill === 'vocabulary' || skill === 'literal' || skill === 'inferential') &&
      typeof q.question === 'string' &&
      q.question.trim() !== '' &&
      Array.isArray(options) &&
      options.length === 4 &&
      options.every((o) => typeof o === 'string' && o.trim() !== '') &&
      new Set(options.map((o) => normalise(String(o)))).size === 4 &&
      Number.isInteger(q.answerIndex) &&
      (q.answerIndex as number) >= 0 &&
      (q.answerIndex as number) <= 3 &&
      typeof q.evidence === 'string';
    if (!valid) continue;
    const evidence = q.evidence as string;
    if (!np.includes(normalise(evidence))) continue;
    if (skill === 'vocabulary' && !(typeof q.word === 'string' && np.includes(normalise(q.word))))
      continue;
    kept.push({
      skill: skill as StoryQuestion['skill'],
      word: skill === 'vocabulary' ? String(q.word).trim() : null,
      question: (q.question as string).trim(),
      options: (options as string[]).map((o) => o.trim()),
      answerIndex: q.answerIndex as number,
      evidence: evidence.trim(),
    });
  }
  if (kept.length < 4) {
    return { ok: false, reason: `Only ${kept.length} valid questions; need at least 4.` };
  }
  return {
    ok: true,
    words,
    readingGrade: grade,
    questions: kept,
    dropped: rawQuestions.length - kept.length,
  };
}

export interface GenerateStoryInput {
  level: number;
  /** Extra questions on this skill, chosen by code from the mastery estimates. */
  focus: StoryQuestion['skill'] | null;
  /** Titles to avoid repeating. */
  recentTitles: string[];
}

/** Implemented in BB-15 to BB-17: generate, run checkStory, run the independent verifier, retry. */
export async function generateStory(_input: GenerateStoryInput): Promise<Story> {
  throw new Error('generateStory is not implemented yet (BB-15)');
}
