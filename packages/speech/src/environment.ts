/**
 * Microphone test before a try (BB-70, docs/PLAN.md section 8).
 * Works on loudness numbers only (RMS, 0..1, one reading per short frame). The browser measures
 * them and throws the audio away. Nothing here sees or keeps a recording.
 */
import { median, percentile } from './stats';

export const ROOM_THRESHOLDS = {
  /** Median background level at or above this is a noisy room. */
  noisyFloor: 0.03,
  /** Background spikes (90th percentile) at or above this mean sudden sounds. */
  noisyPeak: 0.08,
  /** Median level while the learner speaks the test phrase. Below this is too quiet. */
  quietVoice: 0.03,
  /** The voice should be at least this many times louder than the room. */
  minVoiceToRoom: 3,
  /** Fewest background readings that make a test. */
  minReadings: 5,
} as const;

export type RoomStatus = 'good' | 'noisy' | 'too_quiet' | 'retry';

/** Fixed tips. The interface text for each key lives in the i18n catalog. */
export type RoomTip = 'find_quieter_room' | 'turn_off_sounds' | 'move_closer' | 'speak_louder';

export interface RoomCheck {
  status: RoomStatus;
  tips: RoomTip[];
}

export interface RoomInput {
  /** Levels measured while the learner stays quiet. */
  ambient: number[];
  /** Levels measured while the learner says the test phrase. Optional. */
  voice?: number[];
}

const finite = (values: number[]): number[] => values.filter((v) => Number.isFinite(v) && v >= 0);

/** Is the room quiet enough to read in, and what should the learner change? */
export function assessRoom(input: RoomInput): RoomCheck {
  const ambient = finite(input.ambient);
  if (ambient.length < ROOM_THRESHOLDS.minReadings) return { status: 'retry', tips: [] };

  const floor = median(ambient);
  const peak = percentile(ambient, 0.9);
  const tips = new Set<RoomTip>();
  let noisy = false;
  let quiet = false;

  if (floor >= ROOM_THRESHOLDS.noisyFloor) {
    noisy = true;
    tips.add('find_quieter_room');
  } else if (peak >= ROOM_THRESHOLDS.noisyPeak) {
    noisy = true;
    tips.add('turn_off_sounds');
  }

  const voice = finite(input.voice ?? []);
  if (voice.length > 0) {
    const level = median(voice);
    if (level < ROOM_THRESHOLDS.quietVoice) {
      quiet = true;
      tips.add('move_closer');
      tips.add('speak_louder');
    } else if (level < floor * ROOM_THRESHOLDS.minVoiceToRoom) {
      noisy = true;
      tips.add('find_quieter_room');
    }
  }

  const status: RoomStatus = noisy ? 'noisy' : quiet ? 'too_quiet' : 'good';
  return { status, tips: [...tips] };
}
