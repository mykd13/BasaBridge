import { EVIDENCE_RULE } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { THETA_MAX, THETA_MIN, levelToTheta, pCorrect } from './ability';
import {
  calibrateItem,
  calibrationReport,
  estimateDifficulty,
  retirementCheck,
  suggestSubskillOffsets,
  type CalibratedItem,
  type CalibrationResponse,
} from './calibration';

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

describe('retirementCheck', () => {
  it('keeps a healthy question', () => {
    const answers = simulate({ n: 200, difficulty: 0, guess: 0.25, seed: 5 });
    const check = retirementCheck(answers, { guess: 0.25 });
    expect(check.retire).toBe(false);
    expect(check.reasons).toEqual([]);
    expect(check.correlation).toBeGreaterThan(0);
  });

  it('retires a question nearly everyone gets right', () => {
    const answers = simulate({ n: 200, difficulty: -3.8, guess: 0.25, seed: 5, abilityMean: 1 });
    expect(retirementCheck(answers, { guess: 0.25 }).reasons).toContain('too_easy');
  });

  it('retires a question almost nobody gets right beyond guessing', () => {
    const answers = simulate({ n: 200, difficulty: 3.9, guess: 0.25, seed: 5, abilityMean: -1.5 });
    expect(retirementCheck(answers, { guess: 0.25 }).reasons).toContain('too_hard');
  });

  it('retires a question stronger readers get wrong more often', () => {
    const answers = simulate({ n: 200, difficulty: 0, guess: 0.25, discrimination: -1.5, seed: 9 });
    const check = retirementCheck(answers, { guess: 0.25 });
    expect(check.correlation).toBeLessThan(0);
    expect(check.reasons).toContain('negative_discrimination');
  });

  it('judges nothing before the minimum number of answers', () => {
    const answers = Array.from({ length: MIN - 1 }, () => ({ theta: 0, correct: true }));
    const check = retirementCheck(answers, { guess: 0.25 });
    expect(check.enough).toBe(false);
    expect(check.retire).toBe(false);
  });

  it('measures hard questions beyond guessing for each question type', () => {
    // Right exactly as often as guessing an order-the-events question would be.
    const answers = Array.from({ length: 48 }, (_, i) => ({
      theta: i / 24 - 1,
      correct: i % 24 === 0,
    }));
    const check = retirementCheck(answers, { guess: EVIDENCE_RULE.guess.order_events });
    expect(check.beyondGuess).toBeCloseTo(0, 5);
    expect(check.reasons).toContain('too_hard');
  });

  it('cannot compute a link to ability when everyone answers the same way', () => {
    const answers = Array.from({ length: 40 }, (_, i) => ({ theta: i / 10 - 2, correct: true }));
    const check = retirementCheck(answers, { guess: 0.25 });
    expect(check.correlation).toBeNull();
    expect(check.reasons).toEqual(['too_easy']);
  });
});

describe('suggestSubskillOffsets', () => {
  const item = (o: Partial<CalibratedItem> & { offset: number }): CalibratedItem => {
    const storyLevel = o.storyLevel ?? 40;
    return {
      storyLevel,
      subskill: o.subskill ?? 'prediction',
      difficulty: levelToTheta(storyLevel) + o.offset,
      answers: o.answers ?? 30,
    };
  };

  it('returns one suggestion per sub-skill in the rule', () => {
    const out = suggestSubskillOffsets([]);
    expect(out.map((s) => s.subskill)).toEqual(Object.keys(EVIDENCE_RULE.subskillOffset));
  });

  it('keeps the current offset when there are too few calibrated questions', () => {
    const few = Array.from({ length: EVIDENCE_RULE.calibration.minItemsPerSubskill - 1 }, () =>
      item({ offset: 1.2 }),
    );
    const prediction = suggestSubskillOffsets(few).find((s) => s.subskill === 'prediction')!;
    expect(prediction.suggested).toBe(EVIDENCE_RULE.subskillOffset.prediction);
    expect(prediction.items).toBe(few.length);
  });

  it('averages calibrated difficulty above the story level, across levels', () => {
    const items = [10, 30, 50, 70, 90].map((storyLevel) => item({ storyLevel, offset: 0.9 }));
    const prediction = suggestSubskillOffsets(items).find((s) => s.subskill === 'prediction')!;
    expect(prediction.suggested).toBeCloseTo(0.9, 2);
    expect(prediction.current).toBe(EVIDENCE_RULE.subskillOffset.prediction);
  });

  it('gives questions with more answers more say', () => {
    const items = [
      ...Array.from({ length: 4 }, () => item({ subskill: 'key_detail', offset: 0, answers: 30 })),
      item({ subskill: 'key_detail', offset: -1, answers: 360 }),
    ];
    const keyDetail = suggestSubskillOffsets(items).find((s) => s.subskill === 'key_detail')!;
    expect(keyDetail.suggested).toBeCloseTo(-0.75, 2);
  });
});

describe('calibrateItem', () => {
  it('starts from the level and sub-skill and uses the guess rate of the question type', () => {
    const answers = simulate({ n: 300, difficulty: 1, guess: 1 / 24, seed: 2 });
    const out = calibrateItem('q-1', answers, {
      storyLevel: 60,
      subskill: 'sequence',
      type: 'order_events',
    });
    expect(out.startDifficulty).toBeCloseTo(
      levelToTheta(60) + EVIDENCE_RULE.subskillOffset.sequence,
    );
    expect(Math.abs(out.estimate!.difficulty - 1)).toBeLessThan(0.35);
    expect(out.check.retire).toBe(false);
  });

  it('leaves the estimate empty below the minimum', () => {
    const out = calibrateItem('q-2', [], { storyLevel: 5, subskill: 'key_detail' });
    expect(out.estimate).toBeNull();
    expect(out.check.enough).toBe(false);
  });
});

describe('calibrationReport', () => {
  const healthy = calibrateItem(
    'q-ok',
    simulate({ n: 120, difficulty: 0.5, guess: 0.25, seed: 4 }),
    { storyLevel: 50, subskill: 'main_idea' },
  );
  const backwards = calibrateItem(
    'q-bad',
    simulate({ n: 120, difficulty: 0, guess: 0.25, discrimination: -1.5, seed: 8 }),
    { storyLevel: 50, subskill: 'conclusion' },
  );

  it('lists retired questions with the reason and the numbers behind it', () => {
    const md = calibrationReport({
      items: [healthy, backwards],
      offsets: suggestSubskillOffsets([]),
    });
    expect(md).toContain('# Item calibration report');
    expect(md).toContain('Retired: 1.');
    expect(md).toMatch(/\| q-bad \| 50 \| conclusion \| stronger readers do no better/);
    expect(md).toMatch(
      /\| q-ok \| 50 \| main_idea \| -?\d\.\d\d \| -?\d\.\d\d \| [+-]\d\.\d\d \| 120 \|/,
    );
  });

  it('says so when nothing was retired', () => {
    const md = calibrationReport({ items: [healthy], offsets: suggestSubskillOffsets([]) });
    expect(md).toContain('## Retired questions\n\nNone.');
  });

  it('lists every sub-skill offset', () => {
    const md = calibrationReport({ items: [], offsets: suggestSubskillOffsets([]) });
    for (const s of Object.keys(EVIDENCE_RULE.subskillOffset)) expect(md).toContain(`| ${s} |`);
  });

  it('uses plain punctuation only', () => {
    const md = calibrationReport({
      items: [healthy, backwards],
      offsets: suggestSubskillOffsets([]),
    });
    expect(md).not.toMatch(/[–—]/);
  });
});
