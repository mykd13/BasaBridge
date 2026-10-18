import type { TryChecks } from '@basabridge/contracts';

/**
 * Whether a try counts as evidence for level movement (BB-70). Mastery owns this decision. A try
 * held for review does not count until it is confirmed. Older tries without checks count.
 */
export function countsForLevelMovement(checks: TryChecks | undefined): boolean {
  return checks === undefined || checks.review !== 'needs_review';
}
