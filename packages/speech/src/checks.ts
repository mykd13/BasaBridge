/**
 * Environment and speaker checks for one try (BB-70). Run this on the provider output before
 * `alignWords`, then store `checks` on the TryAnalysis. Nothing here stores audio.
 */
import type { TryChecks } from '@basabridge/contracts';
import { assessAuthenticity, type ReviewReason } from './authenticity';
import { detectConditions, type AudioFrame } from './conditions';
import type { RoomTip } from './environment';
import type { HeardWord } from './index';

export interface TryCheckInput {
  heard: HeardWord[];
  frames: AudioFrame[];
  earlierSignatures?: number[][];
}

export interface TryCheckResult {
  /** Heard words with affected words flagged low confidence. Pass these to `alignWords`. */
  heard: HeardWord[];
  checks: TryChecks;
  /** Why the try needs review. For the review queue only, never shown to the learner. */
  reasons: ReviewReason[];
}

export function checkTry(input: TryCheckInput): TryCheckResult {
  const { conditions, heard } = detectConditions(input.heard, input.frames);
  const reasons = assessAuthenticity(input);
  return {
    heard,
    checks: { conditions, review: reasons.length > 0 ? 'needs_review' : 'none' },
    reasons,
  };
}

export function confirmReview(checks: TryChecks): TryChecks {
  return checks.review === 'needs_review' ? { ...checks, review: 'confirmed' } : checks;
}

/**
 * i18n keys for what the learner sees. The words live in the catalog (English and Filipino, simple
 * and standard) and must stay kind and never accuse. A review flag shows only the neutral key.
 */
export const LEARNER_MESSAGE_KEYS = {
  roomTip: {
    find_quieter_room: 'speech.room.tip.findQuieterRoom',
    turn_off_sounds: 'speech.room.tip.turnOffSounds',
    move_closer: 'speech.room.tip.moveCloser',
    speak_louder: 'speech.room.tip.speakLouder',
  } satisfies Record<RoomTip, string>,
  condition: {
    overlapping_voices: 'speech.try.condition.overlappingVoices',
    background_speech: 'speech.try.condition.backgroundSpeech',
    low_volume: 'speech.try.condition.lowVolume',
  } satisfies Record<TryChecks['conditions'][number], string>,
  /** Shown for any review reason. It says only that the try will be looked at, with no cause. */
  review: 'speech.try.review.checkingThisOne',
} as const;
