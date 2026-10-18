/**
 * The Learn section (docs/PLAN.md section 6.3, ADR 0003). Owner: Jhade (BB-52 to BB-54).
 *
 * When a learner misses questions or does not pass a story, Learn teaches the skill they are missing.
 * This package decides which lessons to offer. It holds no lesson text: lessons are written and
 * reviewed by people (BB-53) and loaded into a registry.
 *
 * Rules that matter:
 * - Practice inside Learn never changes the learner's level. Level moves only on story evidence.
 * - A lesson counts as learned only after the learner does well on fresh questions in a real story.
 * - Learners never chat freely with a model. Lessons follow a fixed shape.
 */
import type { DistractorType, SubSkill } from '@basabridge/contracts';

export type LessonSubject = SubSkill | 'decoding' | 'word_practice';
export type Band = 'early' | 'middle' | 'advanced';

export const BAND_RANGES: Record<Band, readonly [number, number]> = {
  early: [1, 30],
  middle: [31, 70],
  advanced: [71, 100],
};

export function bandFor(level: number): Band {
  if (level <= BAND_RANGES.early[1]) return 'early';
  if (level <= BAND_RANGES.middle[1]) return 'middle';
  return 'advanced';
}

export type LessonStep =
  | { kind: 'explain'; text: string }
  | { kind: 'example'; passage: string; point: string }
  /** Guided practice with hints and instant feedback. Items are generated and checked like stories. */
  | { kind: 'practice'; items: number }
  /** Fresh questions with no hints, to see whether the idea stuck. */
  | { kind: 'check'; items: number };

export interface Lesson {
  id: string;
  subject: LessonSubject;
  band: Band;
  title: string;
  /** One sentence in the learner's words: what you will be able to do. */
  goal: string;
  steps: LessonStep[];
  /** Only reviewed lessons are ever shown to learners. */
  status: 'draft' | 'reviewed';
  reviewedBy?: string;
}

export const LEARN_RULES = {
  practiceChangesLevel: false,
  /** Questions on the lesson's skill added to the learner's next story to recheck it. */
  recheckItemsInNextStory: 2,
  /** Share of recheck questions right for a lesson to count as learned. */
  learnedShare: 0.7,
  /** Inline Learn offers during one quiz, so a quiz is not interrupted every question. */
  maxInlineOffersPerQuiz: 1,
} as const;

/** One question the learner got wrong. */
export interface MissedItem {
  subskill?: SubSkill;
  /** Why the chosen option was wrong, when the question was tagged. */
  distractor?: DistractorType | null;
}

export interface Gap {
  subject: LessonSubject;
  misses: number;
  /** The kinds of mistake behind the misses, so the lesson can aim at them. */
  reasons: DistractorType[];
}

export interface GapInput {
  misses: MissedItem[];
  /** Words the reading analysis marked as tricky. */
  flaggedWords?: string[];
  /** Share of words read right on the counted try, when voice was available. */
  wordsRightShare?: number;
}

/** What the learner is missing, most missed first. */
export function gapsFromMisses(input: GapInput): Gap[] {
  const bySubject = new Map<LessonSubject, Gap>();
  for (const m of input.misses) {
    if (!m.subskill) continue;
    const gap = bySubject.get(m.subskill) ?? { subject: m.subskill, misses: 0, reasons: [] };
    gap.misses += 1;
    if (m.distractor && !gap.reasons.includes(m.distractor)) gap.reasons.push(m.distractor);
    bySubject.set(m.subskill, gap);
  }
  const words = input.flaggedWords ?? [];
  if (words.length > 0) {
    bySubject.set('word_practice', { subject: 'word_practice', misses: words.length, reasons: [] });
  }
  if (input.wordsRightShare != null && input.wordsRightShare < 0.85) {
    bySubject.set('decoding', { subject: 'decoding', misses: 1, reasons: [] });
  }
  return [...bySubject.values()].sort((a, b) => b.misses - a.misses);
}

/**
 * Pick lessons for the gaps. Only reviewed lessons are used. If the learner's band has no lesson
 * for a gap, the nearest band is used so a gap is not left without help.
 */
export function recommend(gaps: Gap[], level: number, lessons: Lesson[], limit = 3): Lesson[] {
  const order: Band[] = ['early', 'middle', 'advanced'];
  const own = order.indexOf(bandFor(level));
  const reviewed = lessons.filter((l) => l.status === 'reviewed');
  const picked: Lesson[] = [];
  for (const gap of gaps) {
    const candidates = reviewed
      .filter((l) => l.subject === gap.subject)
      .sort(
        (a, b) => Math.abs(order.indexOf(a.band) - own) - Math.abs(order.indexOf(b.band) - own),
      );
    const best = candidates[0];
    if (best && !picked.includes(best)) picked.push(best);
    if (picked.length >= limit) break;
  }
  return picked;
}

export interface OfferInput {
  wrongAnswers: number;
  /** Learn offers already shown during this quiz. */
  inlineOffersShown: number;
  passed: boolean;
  /** Placement tests teach nothing, so no offers. */
  duringPlacement?: boolean;
}

export interface Offer {
  /** Show a small Learn link under a wrong answer. */
  inline: boolean;
  /** Show a prominent Learn button on the result screen. */
  onResult: boolean;
}

export function shouldOfferLearn(i: OfferInput): Offer {
  if (i.duringPlacement) return { inline: false, onResult: false };
  return {
    inline: i.wrongAnswers > 0 && i.inlineOffersShown < LEARN_RULES.maxInlineOffersPerQuiz,
    onResult: !i.passed || i.wrongAnswers > 0,
  };
}

export interface LessonProgress {
  completed: boolean;
  recheckCorrect: number;
  recheckTotal: number;
}

/** A lesson is learned only after the learner does well on fresh questions in a real story. */
export function isLearned(p: LessonProgress): boolean {
  if (!p.completed || p.recheckTotal < LEARN_RULES.recheckItemsInNextStory) return false;
  return p.recheckCorrect / p.recheckTotal >= LEARN_RULES.learnedShare;
}
