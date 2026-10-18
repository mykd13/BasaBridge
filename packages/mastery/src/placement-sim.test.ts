import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, MIN_LEVEL, PLACEMENT_RULE } from '@basabridge/levels';
import { guessFor, itemDifficulty, levelToTheta, pCorrect } from './ability';
import {
  finishPlacementSession,
  nextPlacement,
  pickPlacementStory,
  recordPlacementStory,
  startPlacement,
  type PlacementBankStory,
  type PlacementSession,
} from './placement';

/**
 * Simulated learners of known level (BB-47). The bounds are the seed tests' bounds in
 * placement.test.ts: at most 8 levels above the true level and at most 30 below.
 */
const ABOVE = 8;
const BELOW = 30;
const QUESTIONS_PER_STORY = 5;

const inBounds = (placed: number, trueLevel: number) =>
  placed - trueLevel <= ABOVE && trueLevel - placed <= BELOW;

/** Small seeded generator (mulberry32) so every run sees the same learners. */
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

/** Stand-in for the placement bank (BB-48): three stories at every fifth level. */
const BANK: PlacementBankStory[] = Array.from({ length: 20 }, (_, i) => (i + 1) * 5).flatMap(
  (level) => ['a', 'b', 'c'].map((v) => ({ id: `L${level}${v}`, level })),
);

function chanceRight(trueLevel: number, storyLevel: number): number {
  return pCorrect(levelToTheta(trueLevel), {
    difficulty: itemDifficulty(storyLevel),
    guess: guessFor('multiple_choice'),
  });
}

/** Run a whole placement. `rightCount` says how many of the questions the learner gets right. */
function run(
  grade: number,
  voice: boolean,
  next: (s: PlacementSession) => PlacementBankStory,
  rightCount: (storyLevel: number) => number,
) {
  let s = startPlacement({ grade, voice });
  while (!nextPlacement(s).done) {
    const story = next(s);
    const right = rightCount(story.level);
    s = recordPlacementStory(s, {
      storyId: story.id,
      level: story.level,
      wordsRightShare: voice ? 0.95 : undefined,
      answers: Array.from({ length: QUESTIONS_PER_STORY }, (_, i) => ({ correct: i < right })),
    });
  }
  return { result: finishPlacementSession(s), stories: s.stories.length };
}

/** Every story at exactly the level the engine asks for. */
const exactStory = (s: PlacementSession): PlacementBankStory => ({
  id: `s${s.stories.length}`,
  level: nextPlacement(s).level!,
});

/** Stories from the stand-in bank, at steps of five. */
const bankStory = (s: PlacementSession): PlacementBankStory => {
  const story = pickPlacementStory(BANK, s);
  if (!story) throw new Error('bank ran out');
  return story;
};

const GRADES = [1, 2, 3, 4, 5, 6];

describe('placement simulation: learners who give their expected score', () => {
  const levels = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, i) => MIN_LEVEL + i);

  it.each([true, false])('lands inside the bounds at every level and grade (voice %s)', (voice) => {
    const misses: string[] = [];
    for (const trueLevel of levels) {
      for (const grade of GRADES) {
        const { result, stories } = run(grade, voice, exactStory, (lvl) =>
          Math.round(QUESTIONS_PER_STORY * chanceRight(trueLevel, lvl)),
        );
        expect(stories).toBeGreaterThanOrEqual(PLACEMENT_RULE.minStories);
        expect(stories).toBeLessThanOrEqual(PLACEMENT_RULE.maxStories);
        if (!inBounds(result.level, trueLevel)) {
          misses.push(`level ${trueLevel}, grade ${grade}: placed ${result.level}`);
        }
      }
    }
    expect(misses).toEqual([]);
  });
});

describe('placement simulation: noisy learners from the bank', () => {
  // Answers are random, so a few runs land outside the bounds. The test checks the share
  // that land inside, and that placement leans low rather than high.
  const trueLevels = Array.from({ length: 19 }, (_, i) => (i + 1) * 5);
  const seeds = [1, 2, 3, 4, 5];

  function runAll(voice: boolean) {
    const errors: number[] = [];
    for (const trueLevel of trueLevels) {
      for (const grade of GRADES) {
        for (const seed of seeds) {
          const random = rng(trueLevel * 1000 + grade * 10 + seed);
          const { result, stories } = run(grade, voice, bankStory, (lvl) => {
            const p = chanceRight(trueLevel, lvl);
            return Array.from({ length: QUESTIONS_PER_STORY }, () => random() < p).filter(Boolean)
              .length;
          });
          expect(stories).toBeLessThanOrEqual(PLACEMENT_RULE.maxStories);
          errors.push(result.level - trueLevel);
        }
      }
    }
    return errors;
  }

  it.each([true, false])('lands inside the bounds in at least 90%% of runs (voice %s)', (voice) => {
    const errors = runAll(voice);
    const inside = errors.filter((e) => e <= ABOVE && -e <= BELOW).length;
    expect(inside / errors.length).toBeGreaterThanOrEqual(0.9);
  });

  it('starts learners at or below their level more often than above it', () => {
    const errors = runAll(true).sort((a, b) => a - b);
    const median = errors[Math.floor(errors.length / 2)]!;
    expect(median).toBeLessThanOrEqual(0);
  });
});
