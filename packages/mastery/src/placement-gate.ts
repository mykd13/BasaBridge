/**
 * Placement gating (docs/PLAN.md section 6.2). Pure functions. Owner: Jhade (BB-49).
 *
 * The server builds a snapshot of the learner's latest placement and asks what happens next. The
 * main course stays locked until placement is done or skipped, and the server enforces that with
 * `mainCourseLocked`, not only the page.
 */
import type { PlacementResult } from '@basabridge/contracts';
import { PLACEMENT_RULE } from '@basabridge/levels';
import {
  nextPlacement,
  nextRecheck,
  placementVoiceMode,
  startLevelForGrade,
  type MicrophoneState,
  type PlacementState,
} from './placement';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The learner's latest placement session, as stored in `placement_sessions`. */
export type LatestPlacement =
  | { status: 'none' }
  | {
      status: 'in_progress';
      state: PlacementState;
      /** Whether the session started with the learner's voice. */
      voice: boolean;
      /** A short re-check after voice was approved, not a full placement. */
      recheck?: boolean;
    }
  | { status: 'skipped'; at: Date }
  | { status: 'finished'; result: PlacementResult; voice: boolean; finishedAt: Date };

export interface PlacementSnapshot {
  latest: LatestPlacement;
  grade: number | null | undefined;
  /** Decided by the server. `not_allowed_yet` is an under-13 learner without guardian approval. */
  mic: MicrophoneState;
  /** True on the first request after the learner signs in. */
  newSignIn: boolean;
  now: Date;
}

export type PlacementGate =
  | { kind: 'start'; voiceMode: 'voice' | 'silent'; startLevel: number }
  | {
      kind: 'resume';
      voiceMode: 'voice' | 'silent';
      recheck: boolean;
      /** Level of the next story. null when every story is read and only the finish is left. */
      nextLevel: number | null;
    }
  | { kind: 'recheck'; startLevel: number }
  | {
      kind: 'open';
      /** Ask again: the learner chose "Do this later" and has just signed in. */
      offerPlacement: boolean;
      retakeAllowed: boolean;
    };

/** What the learner gets next: a placement to start, resume or re-check, or the main course. */
export function placementGate(s: PlacementSnapshot): PlacementGate {
  const { latest } = s;
  switch (latest.status) {
    case 'none':
      return {
        kind: 'start',
        voiceMode: placementVoiceMode(s.mic),
        startLevel: startLevelForGrade(s.grade),
      };
    case 'in_progress': {
      // Keep the mode the session started in, but never use a microphone that is not allowed now.
      const voice = latest.voice && s.mic === 'granted';
      const recheck = latest.recheck === true;
      const next = recheck ? nextRecheck(latest.state) : nextPlacement(latest.state);
      return {
        kind: 'resume',
        voiceMode: voice ? 'voice' : 'silent',
        recheck,
        nextLevel: next.level,
      };
    }
    case 'skipped':
      return { kind: 'open', offerPlacement: s.newSignIn, retakeAllowed: false };
    case 'finished': {
      if (latest.result.flags.includes('voice_missing') && s.mic === 'granted') {
        return { kind: 'recheck', startLevel: latest.result.level };
      }
      const days = (s.now.getTime() - latest.finishedAt.getTime()) / DAY_MS;
      return {
        kind: 'open',
        offerPlacement: false,
        retakeAllowed: days >= PLACEMENT_RULE.retakeAfterDays,
      };
    }
  }
}

/** The server refuses main-course stories while this is true. */
export function mainCourseLocked(gate: PlacementGate): boolean {
  return gate.kind !== 'open';
}

/** No Learn link, button or tab during placement (docs/PLAN.md section 6.3). */
export function learnOffersAllowed(gate: PlacementGate): boolean {
  return gate.kind === 'open';
}
