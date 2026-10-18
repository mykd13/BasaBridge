/**
 * Conditions during a try (BB-70, docs/PLAN.md section 8): overlapping voices, long background
 * speech and very low volume. Words touched by a condition get a low confidence, so the alignment
 * engine flags them and never counts them as errors.
 *
 * Input is word timings from the provider and loudness frames (RMS, 0..1) measured in the browser.
 * No audio is passed in or kept.
 */
import type { TryCondition } from '@basabridge/contracts';
import { LOW_CONFIDENCE_THRESHOLD } from './align';
import type { HeardWord } from './index';
import { mean, median } from './stats';

export interface AudioFrame {
  /** Seconds from the start of the recording. */
  t: number;
  rms: number;
}

export const CONDITION_THRESHOLDS = {
  /** Words that overlap by more than this many seconds were probably said by two voices. */
  overlapSeconds: 0.15,
  /** Overlapping voices need at least this many different words involved... */
  overlapMinWords: 3,
  /** Words longer than this are timing glitches and are left out of the overlap check. */
  maxWordSeconds: 1.5,
  /** ...and this share of all heard words. */
  overlapMinShare: 0.1,
  /** A frame this loud is speech-like. */
  speechRms: 0.05,
  /** Loud frames this close to a heard word belong to the learner. */
  wordPadSeconds: 0.2,
  /** Total unexplained loud time that counts as long background speech. */
  backgroundSeconds: 2,
  /** Words this close to background speech are flagged. */
  backgroundReachSeconds: 1,
  /** A word spoken below this average level is too quiet to trust. */
  lowRms: 0.015,
  /** Share of words that must be quiet before the try is marked low volume. */
  lowMinShare: 0.3,
  /** Fewest heard words before any condition is judged. */
  minWords: 3,
} as const;

export interface ConditionResult {
  conditions: TryCondition[];
  /** Heard words with affected words capped just under the low-confidence threshold. */
  heard: HeardWord[];
}

const T = CONDITION_THRESHOLDS;

export function frameSeconds(frames: AudioFrame[]): number {
  if (frames.length < 2) return 0.1;
  const gaps: number[] = [];
  for (let i = 1; i < frames.length; i++) gaps.push(frames[i]!.t - frames[i - 1]!.t);
  const m = median(gaps);
  return m > 0 ? m : 0.1;
}

function overlappingWords(heard: HeardWord[]): Set<number> {
  // A word stretched over several others is a timing glitch, not a second voice.
  const usable = heard
    .map((_, i) => i)
    .filter((i) => heard[i]!.end - heard[i]!.start <= T.maxWordSeconds);
  const order = usable.sort((a, b) => heard[a]!.start - heard[b]!.start);
  const hit = new Set<number>();
  for (let a = 0; a < order.length; a++) {
    const first = heard[order[a]!]!;
    for (let b = a + 1; b < order.length; b++) {
      const second = heard[order[b]!]!;
      if (second.start >= first.end - T.overlapSeconds) break;
      hit.add(order[a]!);
      hit.add(order[b]!);
    }
  }
  return hit.size >= T.overlapMinWords ? hit : new Set();
}

function backgroundFrames(heard: HeardWord[], frames: AudioFrame[]): AudioFrame[] {
  return frames.filter(
    (f) =>
      f.rms >= T.speechRms &&
      !heard.some((w) => f.t >= w.start - T.wordPadSeconds && f.t <= w.end + T.wordPadSeconds),
  );
}

function quietWords(heard: HeardWord[], frames: AudioFrame[]): Set<number> {
  const hit = new Set<number>();
  heard.forEach((w, i) => {
    const inside = frames.filter((f) => f.t >= w.start && f.t <= w.end).map((f) => f.rms);
    if (inside.length > 0 && mean(inside) < T.lowRms) hit.add(i);
  });
  return hit;
}

/** Find the conditions on a try and flag the words they touch. */
export function detectConditions(heard: HeardWord[], frames: AudioFrame[]): ConditionResult {
  if (heard.length < T.minWords) return { conditions: [], heard };

  const conditions: TryCondition[] = [];
  const affected = new Set<number>();

  const overlap = overlappingWords(heard);
  if (overlap.size / heard.length >= T.overlapMinShare) {
    conditions.push('overlapping_voices');
    overlap.forEach((i) => affected.add(i));
  }

  const loud = backgroundFrames(heard, frames);
  if (loud.length * frameSeconds(frames) >= T.backgroundSeconds) {
    conditions.push('background_speech');
    heard.forEach((w, i) => {
      const near = loud.some(
        (f) => f.t >= w.start - T.backgroundReachSeconds && f.t <= w.end + T.backgroundReachSeconds,
      );
      if (near) affected.add(i);
    });
  }

  const quiet = quietWords(heard, frames);
  if (quiet.size / heard.length >= T.lowMinShare) {
    conditions.push('low_volume');
    quiet.forEach((i) => affected.add(i));
  }

  const cap = LOW_CONFIDENCE_THRESHOLD - 0.01;
  return {
    conditions,
    heard: heard.map((w, i) =>
      affected.has(i) ? { ...w, confidence: Math.min(w.confidence, cap) } : w,
    ),
  };
}
