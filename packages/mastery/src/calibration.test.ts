import { EVIDENCE_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { THETA_MAX, THETA_MIN, pCorrect } from './ability';
import { estimateDifficulty, type CalibrationResponse } from './calibration';

/** Small seeded random source so simulated answers are the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

/** Simulate answers to one question. A negative discrimination makes stronger readers do worse. */
function simulate(o: {
  n: number;
  difficulty: number;
  guess: number;
  discrimination?: number;
  seed?: number;
  abilityMean?: number;
}): CalibrationResponse[] {
  const r = rng(o.seed ?? 1);
  return Array.from({ length: o.n }, () => {
    const theta = (o.abilityMean ?? 0) + normal(r);
    const p = pCorrect(theta, o);
    return { theta, correct: r() < p };
  });
}

const MIN = EVIDENCE_RULE.calibration.minAnswers;

describe('estimateDifficulty', () => {
  it('waits for the minimum number of answers', () => {
    const few = simulate({ n: MIN - 1, difficulty: 0, guess: 0.25 });
    expect(estimateDifficulty(few, { guess: 0.25, prior: 0 })).toBeNull();
    const enough = simulate({ n: MIN, difficulty: 0, guess: 0.25 });
    expect(estimateDifficulty(enough, { guess: 0.25, prior: 0 })).not.toBeNull();
  });

  it('recovers a known difficulty from many answers', () => {
    for (const truth of [-1.5, 0, 0.8, 1.5]) {
      const answers = simulate({ n: 600, difficulty: truth, guess: 0.25, seed: 7 });
      const est = estimateDifficulty(answers, { guess: 0.25, prior: 0 });
      expect(Math.abs((est?.difficulty ?? 99) - truth)).toBeLessThan(0.3);
    }
  });

  it('is pulled toward the starting difficulty when answers are few', () => {
    const answers = simulate({ n: MIN, difficulty: 1.5, guess: 0.25, seed: 3 });
    const fromLow = estimateDifficulty(answers, { guess: 0.25, prior: -1 });
    const fromHigh = estimateDifficulty(answers, { guess: 0.25, prior: 2 });
    expect(fromLow!.difficulty).toBeLessThan(fromHigh!.difficulty);
  });

  it('becomes more certain with more answers', () => {
    const small = estimateDifficulty(simulate({ n: 40, difficulty: 0, guess: 0.25 }), {
      guess: 0.25,
      prior: 0,
    });
    const large = estimateDifficulty(simulate({ n: 400, difficulty: 0, guess: 0.25 }), {
      guess: 0.25,
      prior: 0,
    });
    expect(large!.se).toBeLessThan(small!.se);
  });

  it('gives less say to answers with a lower weight', () => {
    const base = simulate({ n: 200, difficulty: 0, guess: 0.25, seed: 11 });
    // The same answers plus a block of wrong answers from strong readers, first at full weight then light.
    const extra = Array.from({ length: 60 }, () => ({ theta: 2, correct: false }));
    const heavy = estimateDifficulty([...base, ...extra], { guess: 0.25, prior: 0 });
    const light = estimateDifficulty(
      [...base, ...extra.map((e) => ({ ...e, weight: EVIDENCE_RULE.weight.rushed }))],
      { guess: 0.25, prior: 0 },
    );
    expect(light!.difficulty).toBeLessThan(heavy!.difficulty);
  });

  it('stays on the ability scale even when every answer is right or wrong', () => {
    const allRight = Array.from({ length: 50 }, (_, i) => ({
      theta: -3 + i * 0.01,
      correct: true,
    }));
    const allWrong = Array.from({ length: 50 }, (_, i) => ({
      theta: 3 - i * 0.01,
      correct: false,
    }));
    for (const answers of [allRight, allWrong]) {
      const est = estimateDifficulty(answers, { guess: 0.25, prior: 0 });
      expect(est!.difficulty).toBeGreaterThanOrEqual(THETA_MIN);
      expect(est!.difficulty).toBeLessThanOrEqual(THETA_MAX);
    }
  });
});
