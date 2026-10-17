/**
 * Completion, stopping point and reading time (docs/PLAN.md section 8, steps 5 and 6). BB-26.
 * Pure functions over aligned words and word times. No audio and no names reach this file.
 */
import { TryAnalysis, type WordResult } from '@basabridge/contracts';
import type { HeardWord } from './index';
import { summariseTry } from './index';

/**
 * Seconds spent reading: from the start of the first heard word to the end of the last one.
 * Silence before the learner starts and after they finish is left out, so a long wait for the
 * microphone or a late stop button does not lower the pace. Pauses between words stay in,
 * because hesitation is part of how smoothly someone reads.
 */
export function readingSeconds(heard: HeardWord[]): number {
  if (heard.length === 0) return 0;
  const start = Math.min(...heard.map((w) => w.start));
  const end = Math.max(...heard.map((w) => w.end));
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

/** What is stored on a try: the full analysis plus the two columns the database indexes. */
export interface TryRecord {
  analysis: TryAnalysis;
  wordsRight: number;
  wordsPerMinute: number;
}

/** Build the record to store on a try from aligned words and the heard word times. */
export function toTryRecord(words: WordResult[], heard: HeardWord[]): TryRecord {
  const analysis = TryAnalysis.parse(summariseTry(words, readingSeconds(heard)));
  return {
    analysis,
    wordsRight: analysis.wordsRight,
    wordsPerMinute: analysis.wordsPerMinute,
  };
}
