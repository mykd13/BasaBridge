/**
 * Placement gating (BB-49, docs/PLAN.md section 6.2). The main course is locked until placement is
 * done or skipped. A skip starts the learner at the grade default and asks again.
 */
import type { PlacementGate } from '@basabridge/contracts/engine';
import { PLACEMENT_RULE } from '@basabridge/levels';
import type { LearnerProfile } from './types';

const DAY_MS = 86_400_000;

export function placementGate(profile: LearnerProfile, now: Date): PlacementGate {
  const { state, finishedAt, result } = profile.placement;
  switch (state) {
    case 'none':
      return { required: true, state, canRetake: false, due: false };
    case 'in_progress':
      return { required: true, state, canRetake: false, due: false };
    case 'skipped':
      return { required: false, state, canRetake: true, due: true };
    case 'completed': {
      const aged =
        finishedAt != null &&
        now.getTime() - finishedAt.getTime() >= PLACEMENT_RULE.retakeAfterDays * DAY_MS;
      // A silent placement is re-checked once voice is approved.
      const due = Boolean(result?.flags.includes('voice_missing')) && profile.micAllowed;
      return { required: false, state, canRetake: aged || due, due };
    }
  }
}
