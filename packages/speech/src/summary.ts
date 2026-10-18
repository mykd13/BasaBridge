import type { TryAnalysis, WordResult } from '@basabridge/contracts';

/** Words right per minute. Zero when there is no elapsed time. */
export function wordsPerMinute(wordsRight: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round((wordsRight / seconds) * 60);
}

/** Build the per-try summary from aligned words (BB-26). */
export function summariseTry(words: WordResult[], seconds: number): TryAnalysis {
  const expected = words.filter((w) => w.expected !== null);
  const right = expected.filter((w) => w.outcome === 'correct' || w.markedMisheard).length;
  let lastIndex = -1;
  expected.forEach((w, i) => {
    // A word the learner or a parent marked as misheard was read, so it counts as reached.
    if (w.outcome !== 'omission' || w.markedMisheard) lastIndex = i;
  });
  return {
    completed: expected.length > 0 && lastIndex === expected.length - 1,
    lastWordIndex: lastIndex,
    wordsTotal: expected.length,
    wordsRight: right,
    seconds,
    wordsPerMinute: wordsPerMinute(right, seconds),
    words,
  };
}
