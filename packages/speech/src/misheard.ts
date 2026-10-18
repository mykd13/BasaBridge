/**
 * Misheard-word correction (docs/PLAN.md section 8, BB-29).
 *
 * Speech recognition is wrong for some voices and accents, so a learner or a linked parent can mark
 * a word as heard wrongly. These are pure functions: the route that calls them checks who the caller
 * is through the authorization layer (BB-10), reads today's marks, and saves the result.
 *
 * Marks cannot be used to inflate a score: only words that were not already right can be marked,
 * one try allows only a limited share of its words, and one learner has a daily limit. Records carry
 * counts and ids only. No names, usernames, story text or audio (AGENTS.md rule 2).
 */
import type { Decision, TryAnalysis } from '@basabridge/contracts';
import { TryAnalysis as TryAnalysisSchema } from '@basabridge/contracts';
import type { TryRecord } from './completion';
import { summariseTry } from './summary';

/** Placeholders to tune with the fairness tests (BB-40). */
export const MISHEARD_LIMITS = {
  /** Largest share of a try's expected words that may be marked as misheard. */
  maxShareOfTry: 0.2,
  /** Most words one learner may have marked in a day, learner and parent marks together. */
  maxPerDay: 30,
} as const;

export type CorrectionRole = 'learner' | 'parent';

export type MisheardRefusal =
  'nothing_to_mark' | 'not_markable' | 'try_limit_reached' | 'daily_limit_reached';

export interface MisheardInput {
  analysis: TryAnalysis;
  /** Indexes into `analysis.words` of the words to mark. */
  wordIndexes: readonly number[];
  /** Words already marked for this learner today, across all tries. */
  markedToday: number;
}

export type MisheardResult =
  | {
      ok: true;
      /** The recomputed try, ready to store. */
      record: TryRecord;
      /** Indexes newly marked by this call. Words that were already marked are left out. */
      newlyMarked: number[];
      /** Share of the try's expected words now marked, from 0 to 1. */
      correctedShare: number;
    }
  | { ok: false; reason: MisheardRefusal };

/** Words in the passage, which is what the share is measured against. */
function expectedCount(analysis: TryAnalysis): number {
  return analysis.words.filter((w) => w.expected !== null).length;
}

/** How many of a try's expected words are marked as misheard. */
export function markedCount(analysis: TryAnalysis): number {
  return analysis.words.filter((w) => w.expected !== null && w.markedMisheard).length;
}

/**
 * Share of a try's expected words marked as misheard, from 0 to 1. Computed when needed from the
 * stored words, so nothing extra is stored. Report it per try to watch for abuse and for
 * recognition that fails more for some voices.
 */
export function correctedShare(analysis: TryAnalysis): number {
  const total = expectedCount(analysis);
  return total === 0 ? 0 : markedCount(analysis) / total;
}

/** The most words a try of this length may have marked. At least one, so short tries can be fixed. */
export function maxMarksForTry(wordsTotal: number): number {
  return Math.max(1, Math.floor(wordsTotal * MISHEARD_LIMITS.maxShareOfTry));
}

/**
 * Mark words as misheard and recompute the try: words right, completion, stopping point and pace.
 *
 * A word can be marked only when the passage has it and it was not already read right, so marking
 * cannot change a word that was correct and an insertion has nothing to fix. Marking a word that is
 * already marked changes nothing and does not count against the limits. If any limit would be
 * passed, nothing is marked.
 */
export function markMisheard(input: MisheardInput): MisheardResult {
  const { analysis, markedToday } = input;
  const indexes = [...new Set(input.wordIndexes)];
  if (indexes.length === 0) return { ok: false, reason: 'nothing_to_mark' };

  for (const i of indexes) {
    const word = analysis.words[i];
    if (!Number.isInteger(i) || !word || word.expected === null || word.outcome === 'correct') {
      return { ok: false, reason: 'not_markable' };
    }
  }

  const newlyMarked = indexes.filter((i) => !analysis.words[i]!.markedMisheard);
  const total = expectedCount(analysis);
  if (markedCount(analysis) + newlyMarked.length > maxMarksForTry(total)) {
    return { ok: false, reason: 'try_limit_reached' };
  }
  if (markedToday + newlyMarked.length > MISHEARD_LIMITS.maxPerDay) {
    return { ok: false, reason: 'daily_limit_reached' };
  }

  const marked = new Set(newlyMarked);
  const words = analysis.words.map((w, i) => (marked.has(i) ? { ...w, markedMisheard: true } : w));
  const next = TryAnalysisSchema.parse(summariseTry(words, analysis.seconds));
  return {
    ok: true,
    record: {
      analysis: next,
      wordsRight: next.wordsRight,
      wordsPerMinute: next.wordsPerMinute,
      completed: next.completed,
      wordsTotal: next.wordsTotal,
    },
    newlyMarked,
    correctedShare: correctedShare(next),
  };
}

/** What changed, for the decision log and the audit row. Counts and ids only. */
export interface CorrectionRecordInput {
  tryId: string;
  /** Who marked the words: the role in the log, the user id in the audit row. */
  actor: { role: CorrectionRole; userId: string };
  before: TryAnalysis;
  result: Extract<MisheardResult, { ok: true }>;
}

/** The decision log row shown to the learner and to a parent who sees analysis. */
export function correctionDecision(input: CorrectionRecordInput): Decision {
  const { before, result, actor, tryId } = input;
  const who = actor.role === 'parent' ? 'A parent' : 'The learner';
  const n = result.newlyMarked.length;
  return {
    kind: 'analysis',
    title: 'Misheard words corrected',
    summary:
      `${who} marked ${n} ${n === 1 ? 'word' : 'words'} as heard wrongly. ` +
      'The try was worked out again, so words right and pace changed.',
    evidence: {
      tryId,
      markedBy: actor.role,
      wordsMarked: n,
      wordsRightBefore: before.wordsRight,
      wordsRightAfter: result.record.wordsRight,
      wordsPerMinuteBefore: before.wordsPerMinute,
      wordsPerMinuteAfter: result.record.wordsPerMinute,
      wordsTotal: result.record.wordsTotal,
      correctedShare: result.correctedShare,
    },
  };
}

/** The audit row: who and what. The time is set by the database. */
export interface CorrectionAudit {
  actorUserId: string;
  action: 'try.misheard';
  target: string;
}

export function correctionAudit(input: CorrectionRecordInput): CorrectionAudit {
  return {
    actorUserId: input.actor.userId,
    action: 'try.misheard',
    target: `try:${input.tryId}`,
  };
}
