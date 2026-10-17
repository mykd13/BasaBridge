import { describe, expect, it } from 'vitest';
import { alignWords } from './align';
import { assessAuthenticity, timingSignature } from './authenticity';
import { checkTry, confirmReview, countsForLevelMovement } from './checks';
import { detectConditions, type AudioFrame } from './conditions';
import { assessRoom } from './environment';
import type { HeardWord } from './index';
import { simulate, SIM_FRAME } from './simulate';

const words = (n: number, step = 0.5, len = 0.3): HeardWord[] =>
  Array.from({ length: n }, (_, i) => ({
    text: `w${i}`,
    start: i * step,
    end: i * step + len,
    confidence: 0.9,
  }));

const flat = (from: number, to: number, rms: number): AudioFrame[] => {
  const out: AudioFrame[] = [];
  for (let t = from; t < to; t += SIM_FRAME) out.push({ t, rms });
  return out;
};

describe('assessRoom', () => {
  const quiet = [0.004, 0.005, 0.006, 0.005, 0.004, 0.006];
  it('passes a quiet room', () => {
    expect(assessRoom({ ambient: quiet })).toEqual({ status: 'good', tips: [] });
  });
  it('asks for a quieter room when the background is high', () => {
    const r = assessRoom({ ambient: quiet.map((v) => v + 0.04) });
    expect(r.status).toBe('noisy');
    expect(r.tips).toContain('find_quieter_room');
  });
  it('spots sudden sounds', () => {
    const r = assessRoom({
      ambient: [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.2, 0.2, 0.2],
    });
    expect(r.tips).toEqual(['turn_off_sounds']);
  });
  it('asks the learner to move closer when the voice is faint', () => {
    const r = assessRoom({ ambient: quiet, voice: [0.01, 0.012, 0.011] });
    expect(r.status).toBe('too_quiet');
    expect(r.tips).toEqual(['move_closer', 'speak_louder']);
  });
  it('treats a voice barely above the room as noisy', () => {
    const r = assessRoom({ ambient: quiet.map(() => 0.02), voice: [0.04, 0.05, 0.045] });
    expect(r.status).toBe('noisy');
  });
  it('asks for a retry with too few readings or bad numbers', () => {
    expect(assessRoom({ ambient: [0.01, 0.01] }).status).toBe('retry');
    expect(assessRoom({ ambient: [NaN, NaN, NaN, NaN, NaN, NaN] }).status).toBe('retry');
  });
});

describe('detectConditions', () => {
  it('leaves a clean try alone', () => {
    const heard = words(10);
    const frames = heard.flatMap((w) => flat(w.start, w.end, 0.1));
    const r = detectConditions(heard, frames);
    expect(r.conditions).toEqual([]);
    expect(r.heard).toEqual(heard);
  });

  it('marks overlapping voices and flags the overlapped words', () => {
    const heard = words(10);
    // Four extra words said on top of the learner's words.
    const extra = [0, 1, 2, 3].map((i) => ({
      ...heard[i]!,
      text: `x${i}`,
      start: heard[i]!.start + 0.05,
    }));
    const r = detectConditions([...heard, ...extra], []);
    expect(r.conditions).toContain('overlapping_voices');
    expect(r.heard.filter((w) => w.confidence < 0.5).length).toBe(8);
  });

  it('ignores one or two slightly overlapping words', () => {
    const heard = words(10);
    heard[3] = { ...heard[3]!, end: heard[4]!.start + 0.3 };
    expect(detectConditions(heard, []).conditions).toEqual([]);
  });

  it('marks long background speech and flags nearby words only', () => {
    const heard = words(10, 1, 0.3);
    // Someone talks for 3 seconds starting 0.4s after the last word.
    const frames = [...heard.flatMap((w) => flat(w.start, w.end, 0.1)), ...flat(9.7, 12.7, 0.12)];
    const r = detectConditions(heard, frames);
    expect(r.conditions).toContain('background_speech');
    expect(r.heard[0]!.confidence).toBe(0.9);
    expect(r.heard[9]!.confidence).toBeLessThan(0.5);
  });

  it('ignores a short cough', () => {
    const heard = words(10, 1, 0.3);
    const frames = [...heard.flatMap((w) => flat(w.start, w.end, 0.1)), ...flat(5.5, 6, 0.3)];
    expect(detectConditions(heard, frames).conditions).toEqual([]);
  });

  it('marks very low volume', () => {
    const heard = words(10);
    const frames = heard.flatMap((w) => flat(w.start, w.end, 0.008));
    const r = detectConditions(heard, frames);
    expect(r.conditions).toEqual(['low_volume']);
    expect(r.heard.every((w) => w.confidence < 0.5)).toBe(true);
  });

  it('does nothing on very short readings', () => {
    expect(detectConditions(words(2), flat(0, 1, 0.001)).conditions).toEqual([]);
  });

  it('does not change the input', () => {
    const heard = words(10);
    const copy = structuredClone(heard);
    detectConditions(
      heard,
      heard.flatMap((w) => flat(w.start, w.end, 0.005)),
    );
    expect(heard).toEqual(copy);
  });

  it('affected words are never counted as errors by the alignment', () => {
    const expected = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
    const heard: HeardWord[] = ['the', 'cat', 'sat', 'on', 'the', 'mat'].map((text, i) => ({
      text: i === 1 ? 'cut' : text,
      start: i * 0.5,
      end: i * 0.5 + 0.3,
      confidence: 0.9,
    }));
    const frames = heard.flatMap((w) => flat(w.start, w.end, 0.005));
    const { heard: capped } = detectConditions(heard, frames);
    const results = alignWords(expected, capped);
    expect(results.some((r) => r.outcome === 'substitution')).toBe(false);
  });
});

describe('assessAuthenticity', () => {
  it('flags the same timing as an earlier try', () => {
    const earlier = timingSignature(words(12));
    const later = words(12).map((w) => ({ ...w, start: w.start + 40, end: w.end + 40 }));
    expect(assessAuthenticity({ heard: later, frames: [], earlierSignatures: [earlier] })).toEqual([
      'same_timing_as_earlier_try',
    ]);
  });

  it('does not flag a similar but human re-read', () => {
    const earlier = timingSignature(words(12));
    const later = words(12).map((w, i) => ({ ...w, start: w.start + i * 0.08 }));
    expect(assessAuthenticity({ heard: later, frames: [], earlierSignatures: [earlier] })).toEqual(
      [],
    );
  });

  it('needs steady level and steady pace together', () => {
    const even = words(12);
    const steadyFrames = even.flatMap((w) => flat(w.start, w.end, 0.1));
    expect(assessAuthenticity({ heard: even, frames: steadyFrames })).toEqual([
      'steady_level_and_pace',
    ]);
    const uneven = even.map((w, i) => ({
      ...w,
      start: w.start + (i % 3) * 0.2,
      end: w.end + (i % 3) * 0.2,
    }));
    expect(assessAuthenticity({ heard: uneven, frames: steadyFrames })).toEqual([]);
  });
});

describe('checkTry and level movement', () => {
  it('holds a flagged try out of level movement until confirmed', () => {
    const heard = words(12);
    const earlier = timingSignature(heard);
    const r = checkTry({ heard, frames: [], earlierSignatures: [earlier] });
    expect(r.checks.review).toBe('needs_review');
    expect(countsForLevelMovement(r.checks)).toBe(false);
    expect(countsForLevelMovement(confirmReview(r.checks))).toBe(true);
  });

  it('counts tries with only conditions, and older tries without checks', () => {
    expect(countsForLevelMovement({ conditions: ['low_volume'], review: 'none' })).toBe(true);
    expect(countsForLevelMovement(undefined)).toBe(true);
  });

  it('keeps no audio: the result holds only words, numbers and codes', () => {
    const r = checkTry({ heard: words(10), frames: flat(0, 5, 0.1) });
    expect(JSON.stringify(r)).not.toMatch(/blob|audio|samples/i);
  });
});

describe('flag rates on simulated tries (thresholds recorded in docs/speech-checks.md)', () => {
  const N = 2000;

  it('rarely flags clean tries', () => {
    let conditions = 0;
    let review = 0;
    for (let seed = 1; seed <= N; seed++) {
      const t = simulate({ seed });
      const r = checkTry({ heard: t.heard, frames: t.frames, earlierSignatures: [] });
      if (r.checks.conditions.length > 0) conditions++;
      if (r.checks.review !== 'none') review++;
    }
    expect(conditions / N).toBeLessThan(0.01);
    expect(review / N).toBeLessThan(0.005);
  });

  it('detects injected conditions', () => {
    const rate = (kind: 'overlap' | 'background' | 'quiet', condition: string): number => {
      let hit = 0;
      for (let seed = 1; seed <= 500; seed++) {
        const t = simulate({ seed, inject: kind });
        if (
          checkTry({ heard: t.heard, frames: t.frames }).checks.conditions.includes(
            condition as never,
          )
        )
          hit++;
      }
      return hit / 500;
    };
    expect(rate('overlap', 'overlapping_voices')).toBeGreaterThan(0.95);
    expect(rate('background', 'background_speech')).toBeGreaterThan(0.95);
    expect(rate('quiet', 'low_volume')).toBeGreaterThan(0.95);
  });

  it('detects replayed timing and synthetic-steady reading', () => {
    let replay = 0;
    let steady = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const first = simulate({ seed });
      const again = simulate({ seed, replayOf: first, shift: 30 });
      if (
        checkTry({
          heard: again.heard,
          frames: again.frames,
          earlierSignatures: [timingSignature(first.heard)],
        }).checks.review === 'needs_review'
      )
        replay++;
      const robot = simulate({ seed, inject: 'steady' });
      if (checkTry({ heard: robot.heard, frames: robot.frames }).checks.review === 'needs_review')
        steady++;
    }
    expect(replay / 500).toBeGreaterThan(0.99);
    expect(steady / 500).toBeGreaterThan(0.95);
  });
});
