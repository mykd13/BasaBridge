/**
 * Synthetic tries for measuring flag rates in tests (BB-70). Seeded, so results repeat.
 * Numbers only. This is not real child speech: real recordings are checked by hand (BB-22, BB-40).
 */
import type { AudioFrame } from './conditions';
import type { HeardWord } from './index';

export const SIM_FRAME = 0.05;

export interface SimOptions {
  seed: number;
  inject?: 'overlap' | 'background' | 'quiet' | 'steady';
  /** Reuse the timing of an earlier simulated try, moved later by `shift` seconds. */
  replayOf?: SimTry;
  shift?: number;
}

export interface SimTry {
  heard: HeardWord[];
  frames: AudioFrame[];
}

/** Small deterministic random numbers (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, lo: number, hi: number): number => lo + (hi - lo) * r();

export function simulate(options: SimOptions): SimTry {
  const r = rng(options.seed);
  const steady = options.inject === 'steady';
  const count = 20 + Math.floor(r() * 40);
  // A reader's room and voice differ from child to child.
  const room = between(r, 0.003, 0.02);
  const voice = options.inject === 'quiet' ? between(r, 0.004, 0.01) : between(r, 0.06, 0.25);

  let heard: HeardWord[];
  if (options.replayOf) {
    const shift = options.shift ?? 0;
    heard = options.replayOf.heard.map((w) => ({
      ...w,
      start: w.start + shift,
      end: w.end + shift,
    }));
  } else {
    heard = [];
    let t = between(r, 0.2, 1);
    for (let i = 0; i < count; i++) {
      const len = steady ? 0.3 : between(r, 0.15, 0.7);
      const gap = steady ? 0.2 : between(r, 0.02, 0.45) + (r() < 0.1 ? between(r, 0.5, 1.2) : 0);
      heard.push({ text: `w${i}`, start: t, end: t + len, confidence: between(r, 0.6, 1) });
      t += len + gap;
    }
  }

  if (options.inject === 'overlap') {
    const extra = heard
      .filter((_, i) => i % 4 === 0)
      .map((w) => ({ ...w, text: 'other', start: w.start + 0.05, end: w.end + 0.05 }));
    heard = [...heard, ...extra];
  }

  // Recording runs on for a while after the last word, as it does while the learner taps stop.
  const end = Math.max(...heard.map((w) => w.end)) + (options.inject === 'background' ? 3.5 : 0.5);
  const frames: AudioFrame[] = [];
  for (let t = 0; t < end; t += SIM_FRAME) {
    const speaking = heard.some((w) => t >= w.start && t <= w.end);
    const jitter = steady ? 1 + (r() - 0.5) * 0.05 : Math.exp((r() - 0.5) * 1.2);
    frames.push({ t, rms: speaking ? voice * jitter : room * (0.5 + r()) });
  }
  if (options.inject === 'background') {
    // Someone talks nearby after the learner has finished.
    const from = end - 3.2;
    frames.forEach((f) => {
      if (f.t >= from && f.t < from + 3) f.rms = Math.max(f.rms, between(r, 0.06, 0.15));
    });
  }
  return { heard, frames };
}
