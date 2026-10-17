/**
 * Completion, stopping point and reading time (docs/PLAN.md section 8, steps 5 and 6). BB-26.
 * Pure functions over aligned words and word times. No audio and no names reach this file.
 */
import { TryAnalysis } from '@basabridge/contracts';
import { alignWordsTimed, type HeardSpan } from './align';
import type { HeardWord } from './index';
import { summariseTry } from './summary';

/**
 * Seconds spent reading: from the start of the first word the learner read to the end of the last.
 * Pass the spans of words matched to the passage (see `alignWordsTimed`). Noise, off-passage
 * chatter and silence before and after reading are left out, so a cough before starting or a late
 * stop button does not lower the pace. Pauses between words stay in, because hesitation is part
 * of how smoothly someone reads. Spans with times that are not finite numbers are ignored.
 */
export function readingSeconds(spans: Array<HeardSpan | null>): number {
  const read = spans.filter(
    (s): s is HeardSpan => s !== null && Number.isFinite(s.start) && Number.isFinite(s.end),
  );
  if (read.length === 0) return 0;
  const start = Math.min(...read.map((s) => s.start));
  const end = Math.max(...read.map((s) => s.end));
  return Math.max(0, end - start);
}

/** Where a try stopped, for the "stopped early" screen (canvas D1). */
export interface StoppingPoint {
  /** Index among the expected words of the last word the learner reached. -1 when none. */
  lastWordIndex: number;
  /** The last expected word reached, or null when none was. */
  lastWord: string | null;
  /** Expected words after that point that were not read. */
  wordsLeft: number;
  wordsTotal: number;
}

/** The stopping point of a try, or null when the learner reached the last expected word. */
export function stoppingPoint(analysis: TryAnalysis): StoppingPoint | null {
  if (analysis.completed) return null;
  const expected = analysis.words.filter((w) => w.expected !== null);
  const last = analysis.lastWordIndex >= 0 ? expected[analysis.lastWordIndex] : undefined;
  return {
    lastWordIndex: analysis.lastWordIndex,
    lastWord: last?.expected ?? null,
    wordsLeft: analysis.wordsTotal - (analysis.lastWordIndex + 1),
    wordsTotal: analysis.wordsTotal,
  };
}

/** What is stored on a try: the full analysis plus the values the database indexes. */
export interface TryRecord {
  analysis: TryAnalysis;
  wordsRight: number;
  wordsPerMinute: number;
  /** Also inside `analysis`; here because the `tries` table has columns for them. */
  completed: boolean;
  wordsTotal: number;
}

/**
 * Align the passage with what was heard and build the record to store on a try.
 *
 * Complete means the last expected word was reached. It sets no minimum for words right: the pass
 * rule in `packages/levels` decides the rest. Words with times that are not finite numbers add
 * nothing to the reading time. Throws a ZodError if the result is still not a valid `TryAnalysis`,
 * so a bad recording fails visibly instead of storing a wrong record.
 *
 * To recompute after a word is marked as misheard, call `summariseTry` with the edited words and
 * the stored `analysis.seconds`.
 */
export function toTryRecord(expected: string[], heard: HeardWord[]): TryRecord {
  const { results, spans } = alignWordsTimed(expected, heard);
  const analysis = TryAnalysis.parse(summariseTry(results, readingSeconds(spans)));
  return {
    analysis,
    wordsRight: analysis.wordsRight,
    wordsPerMinute: analysis.wordsPerMinute,
    completed: analysis.completed,
    wordsTotal: analysis.wordsTotal,
  };
}
