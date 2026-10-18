/**
 * Playback and "not the learner" check (BB-70, docs/PLAN.md section 8).
 * It looks for signs that a try came from a recording, using word timings and loudness numbers.
 * It does not identify voices and keeps no audio. A sign only sends the try for review. It is
 * never a verdict, and nothing shown to the learner says what was suspected.
 */
import type { AudioFrame } from './conditions';
import type { HeardWord } from './index';
import { mean, variation } from './stats';

export type ReviewReason = 'same_timing_as_earlier_try' | 'steady_level_and_pace';

export const AUTHENTICITY_THRESHOLDS = {
  /** Fewest words before timings are compared. */
  minWords: 8,
  /** Word start times that agree within this many seconds, across the whole try, are a repeat. */
  repeatTolerance: 0.03,
  /** Loudness that varies less than this (coefficient of variation) is unnaturally steady. */
  steadyLevel: 0.12,
  /** Below this average level there is nothing to judge, for example a muted microphone. */
  minLevel: 0.005,
  /** Fewest speech frames before loudness is judged. */
  minFrames: 20,
  /** Word-to-word timing that varies less than this is unnaturally even. */
  steadyPace: 0.1,
} as const;

const T = AUTHENTICITY_THRESHOLDS;

/** Start time of each word relative to the first word. A fingerprint of the pacing, not of a voice. */
export function timingSignature(heard: HeardWord[]): number[] {
  const starts = heard.map((w) => w.start).sort((a, b) => a - b);
  if (starts.length === 0) return [];
  const first = starts[0]!;
  return starts.map((s) => s - first);
}

function sameTiming(a: number[], b: number[]): boolean {
  if (a.length < T.minWords || a.length !== b.length) return false;
  return a.every((v, i) => Math.abs(v - b[i]!) <= T.repeatTolerance);
}

function speechLevels(heard: HeardWord[], frames: AudioFrame[]): number[] {
  return frames.filter((f) => heard.some((w) => f.t >= w.start && f.t <= w.end)).map((f) => f.rms);
}

function paceIsEven(heard: HeardWord[]): boolean {
  if (heard.length < T.minWords) return false;
  const starts = heard.map((w) => w.start).sort((a, b) => a - b);
  const steps: number[] = [];
  for (let i = 1; i < starts.length; i++) steps.push(starts[i]! - starts[i - 1]!);
  return variation(steps) < T.steadyPace;
}

export interface AuthenticityInput {
  heard: HeardWord[];
  frames: AudioFrame[];
  /** Timing signatures of the learner's earlier tries on the same story. Timings only. */
  earlierSignatures?: number[][];
}

/**
 * Reasons to send the try for review, empty when nothing stands out. Needs one strong sign (the
 * same timing as an earlier try) or two weaker ones together (steady level and steady pace), so a
 * single odd reading does not flag a learner.
 */
export function assessAuthenticity(input: AuthenticityInput): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  const signature = timingSignature(input.heard);
  if ((input.earlierSignatures ?? []).some((earlier) => sameTiming(signature, earlier))) {
    reasons.push('same_timing_as_earlier_try');
  }

  const levels = speechLevels(input.heard, input.frames);
  if (
    levels.length >= T.minFrames &&
    mean(levels) >= T.minLevel &&
    variation(levels) < T.steadyLevel &&
    paceIsEven(input.heard)
  ) {
    reasons.push('steady_level_and_pace');
  }
  return reasons;
}
