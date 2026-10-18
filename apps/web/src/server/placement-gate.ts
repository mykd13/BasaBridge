import { redirect } from 'next/navigation';
import type { SessionUser } from './session';

export const PLACEMENT_PATH = '/placement';

export interface PlacementGate {
  hasFinishedPlacement(userId: string): Promise<boolean>;
}

/**
 * BB-49 fills this in with the real check. Until then every learner passes, because there is
 * no placement result to read yet.
 */
export const placementGate: PlacementGate = {
  hasFinishedPlacement: async () => true,
};

/** Send a learner with no finished placement to the start of placement. */
export async function requirePlacement(
  user: SessionUser,
  gate: PlacementGate = placementGate,
): Promise<void> {
  if (!(await gate.hasFinishedPlacement(user.id))) redirect(PLACEMENT_PATH);
}
