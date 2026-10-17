/**
 * Reading aloud during placement (docs/PLAN.md sections 6.2 and 8, BB-50). Pure functions.
 * A placement story gets one scored read. A speech error is never the learner's fault, so a
 * failed recording is retried, then skipped. It is never scored as zero.
 */
import type { TryAnalysis } from '@basabridge/contracts';

/** How many times a failed placement recording is offered again before the story is skipped. */
export const PLACEMENT_READ_RETRIES = 1;

export type PlacementReadInput =
  | { ok: true; analysis: TryAnalysis }
  /** The provider errored, the recording was empty or unusable, or the upload failed. */
  | { ok: false };

export type PlacementReadOutcome =
  { status: 'scored'; wordsRightShare: number } | { status: 'retry' } | { status: 'skipped' };

/**
 * Turn one placement read into what placement needs.
 * `failures` is how many failed recordings this story has had so far, including this one.
 */
export function placementReadOutcome(
  input: PlacementReadInput,
  failures: number,
): PlacementReadOutcome {
  const usable = input.ok && input.analysis.wordsTotal > 0 && input.analysis.words.length > 0;
  if (!input.ok || !usable) {
    return failures <= PLACEMENT_READ_RETRIES ? { status: 'retry' } : { status: 'skipped' };
  }
  const { wordsRight, wordsTotal } = input.analysis;
  return { status: 'scored', wordsRightShare: Math.min(1, Math.max(0, wordsRight / wordsTotal)) };
}
