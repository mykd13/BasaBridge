import type { TryChecks } from '@basabridge/contracts';

/**
 * Whether a try counts as evidence for level movement (BB-70). Mastery owns this decision. A try
 * held for review does not count until it is confirmed. Older tries without checks count.
 */
export function countsForLevelMovement(checks: TryChecks | undefined): boolean {
  return checks === undefined || checks.review !== 'needs_review';
}

/** Where an answer came from. Only a real story is evidence for the level. */
export type EvidenceSource = 'story' | 'placement' | 'learn';

/**
 * Whether answers from this source may move the level (ADR 0003). Practice and check items inside
 * Learn never do, and placement sets a starting level through its own rules, not level movement.
 */
export function countsAsLevelEvidence(source: EvidenceSource): boolean {
  return source === 'story';
}
