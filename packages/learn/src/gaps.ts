/**
 * Turn what happened in a real story into the input for `gapsFromMisses`. Code decides the gaps:
 * which sub-skills were missed and why, which words were tricky, and whether words-right was low.
 *
 * The inputs mirror the stored rows (answers joined to questions, and the counted try's analysis),
 * so the caller can pass rows read through the authorization layer without reshaping them.
 */
import { DistractorType, SubSkill, type TryAnalysis, type WordResult } from '@basabridge/contracts';
import type { GapInput, MissedItem } from './index';

/** One answer and the question it answered, as stored in `answers` and `questions`. */
export interface AnsweredQuestion {
  correct: boolean;
  /** The option index the learner chose. */
  chosen: number;
  /** questions.subskill. Untagged older questions have none. */
  subskill: string | null;
  /** questions.type. */
  type: string;
  /** questions.distractors: one entry per option, null for the right one. */
  distractors: unknown;
}

export interface StoryEvidence {
  answers: AnsweredQuestion[];
  /** Analysis of the counted try. Absent when the learner read silently. */
  countedTry?: TryAnalysis;
}

/** Outcomes the reading analysis counts as a tricky word. Low confidence is never one. */
const TRICKY: ReadonlySet<WordResult['outcome']> = new Set(['substitution', 'omission']);

/** Words the reading analysis flagged on one try, each once, in reading order. */
export function trickyWords(words: readonly WordResult[]): string[] {
  const seen = new Set<string>();
  for (const w of words) {
    if (!w.expected || w.markedMisheard || !TRICKY.has(w.outcome)) continue;
    const word = w.expected.toLowerCase().replace(/[^a-z']/g, '');
    if (word.length > 0) seen.add(word);
  }
  return [...seen];
}

/** Why the chosen option was wrong, when the question was tagged with distractor types. */
function distractorFor(a: AnsweredQuestion): DistractorType | null {
  if (a.type !== 'multiple_choice') return null;
  const tags = DistractorType.nullable().array().safeParse(a.distractors);
  if (!tags.success) return null;
  return tags.data[a.chosen] ?? null;
}

export function missedItem(a: AnsweredQuestion): MissedItem {
  const subskill = SubSkill.safeParse(a.subskill);
  return {
    ...(subskill.success ? { subskill: subskill.data } : {}),
    distractor: distractorFor(a),
  };
}

export function gapInputFromStory(e: StoryEvidence): GapInput {
  const input: GapInput = { misses: e.answers.filter((a) => !a.correct).map(missedItem) };
  const t = e.countedTry;
  if (t) {
    input.flaggedWords = trickyWords(t.words);
    if (t.wordsTotal > 0) input.wordsRightShare = t.wordsRight / t.wordsTotal;
  }
  return input;
}
