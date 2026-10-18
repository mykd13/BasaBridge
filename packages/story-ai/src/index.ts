/**
 * Story generation with checks (docs/PLAN.md section 7). Owner: Jhade (BB-15 to BB-18).
 * Seed: the deterministic checks ported from the early prototype, with comprehension tags (BB-43).
 * Generation and the verifier call are stubs.
 */
import type { Story } from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';
import type { StoryPromptInput } from './prompt';
import { TaggedQuestion, tagProblem } from './tags';

export * from './prompt';
export * from './tags';

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

export type CheckResult =
  | { ok: true; words: number; readingGrade: number; questions: TaggedQuestion[]; dropped: number }
  | { ok: false; reason: string };

/** Raw question as returned by a model, before any trust. */
export interface RawQuestion {
  skill?: unknown;
  subskill?: unknown;
  word?: unknown;
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  distractors?: unknown;
  evidence?: unknown;
}

const trimmed = (v: unknown) => (typeof v === 'string' ? v.trim() : v);

/**
 * Deterministic checks on a generated story: length range, reading grade cap, valid questions,
 * distinct options, evidence sentence present verbatim, vocabulary word present, and valid tags
 * that agree with the question (ADR 0003). At least four valid questions must remain.
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
  const kept: TaggedQuestion[] = [];
  for (const raw of rawQuestions) {
    const parsed = TaggedQuestion.safeParse({
      skill: raw.skill,
      subskill: raw.subskill,
      word: raw.skill === 'vocabulary' ? (trimmed(raw.word) ?? null) : null,
      question: trimmed(raw.question),
      options: Array.isArray(raw.options) ? raw.options.map(trimmed) : raw.options,
      answerIndex: raw.answerIndex,
      distractors: raw.distractors,
      evidence: trimmed(raw.evidence),
    });
    if (!parsed.success) continue;
    const q = parsed.data;
    if (new Set(q.options.map(normalise)).size !== 4) continue;
    if (!np.includes(normalise(q.evidence))) continue;
    if (tagProblem(q) !== null) continue;
    if (q.skill === 'vocabulary' && !np.includes(normalise(q.word!))) continue;
    kept.push(q);
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

export type GenerateStoryInput = StoryPromptInput;

/** Implemented in BB-15 to BB-17: generate, run checkStory, run the independent verifier, retry. */
export async function generateStory(_input: GenerateStoryInput): Promise<Story> {
  throw new Error('generateStory is not implemented yet (BB-15)');
}
