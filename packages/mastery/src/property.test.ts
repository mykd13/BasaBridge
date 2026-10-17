import type { ComprehensionSkill, QuestionType } from '@basabridge/contracts';
import { MAX_LEVEL, MIN_LEVEL } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { THETA_MAX, THETA_MIN, guessFor, itemDifficulty, probAbove } from './ability';
import {
  ABILITY_SCOPES,
  decideLevel,
  startingState,
  summariseAll,
  updateAbility,
  type MasteryModel,
} from './engine';
import { estimateSkills, type StoryAnswers } from './simple';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;
const SKILLS: readonly ComprehensionSkill[] = ['vocabulary', 'literal', 'inferential'];
const TYPES: readonly QuestionType[] = ['multiple_choice', 'choose_all', 'order_events'];
const RUNS = 200;

describe('properties', () => {
  it('ability estimates stay on the scale and probabilities between 0 and 1', () => {
    for (let run = 0; run < RUNS; run++) {
      const r = rng(run);
      const level = MIN_LEVEL + Math.floor(r() * MAX_LEVEL);
      let state = startingState(level, {});
      for (let n = 0; n < 30; n++) {
        state = updateAbility(state, pick(r, SKILLS), {
          difficulty: itemDifficulty(MIN_LEVEL + Math.floor(r() * MAX_LEVEL)),
          guess: guessFor(pick(r, TYPES)),
          correct: r() < 0.5,
          weight: r() < 0.3 ? r() : 1,
        });
      }
      const s = summariseAll(state);
      for (const scope of ABILITY_SCOPES) {
        expect(s[scope].mean).toBeGreaterThanOrEqual(THETA_MIN);
        expect(s[scope].mean).toBeLessThanOrEqual(THETA_MAX);
        expect(s[scope].sd).toBeGreaterThanOrEqual(0);
        const p = probAbove(state[scope], r() * 6 - 3);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('simple estimates stay between 0 and 1', () => {
    for (let run = 0; run < RUNS; run++) {
      const r = rng(1000 + run);
      const stories: StoryAnswers[] = Array.from({ length: 1 + Math.floor(r() * 10) }, () => ({
        questions: Array.from({ length: 5 }, () => ({
          skill: pick(r, SKILLS),
          correct: r() < 0.5,
        })),
      }));
      for (const e of Object.values(estimateSkills(stories))) {
        if (e.estimate === null) continue;
        expect(e.estimate).toBeGreaterThanOrEqual(0);
        expect(e.estimate).toBeLessThanOrEqual(1);
      }
    }
  });

  for (const model of ['ability', 'simple'] as MasteryModel[]) {
    it(`levels stay between ${MIN_LEVEL} and ${MAX_LEVEL} under the ${model} model`, () => {
      for (let run = 0; run < RUNS; run++) {
        const r = rng(2000 + run);
        let level = MIN_LEVEL + Math.floor(r() * MAX_LEVEL);
        let passes = 0;
        let state = startingState(level, {});
        const recent: number[] = [];
        for (let n = 0; n < 50; n++) {
          const good = r() < 0.5;
          for (let q = 0; q < 5; q++) {
            state = updateAbility(state, pick(r, SKILLS), {
              difficulty: itemDifficulty(level),
              guess: 0.25,
              correct: good ? r() < 0.9 : r() < 0.2,
            });
          }
          recent.push(good ? 0.95 : 0.6);
          const o = decideLevel({
            level,
            passes,
            result: {
              wordsRightShare: recent.at(-1) ?? 0,
              questionsCorrect: good ? 5 : 0,
              questionsTotal: 5,
            },
            comprehension: state.comprehension,
            recentWordsRight: recent,
            model,
          });
          expect(o.level).toBeGreaterThanOrEqual(MIN_LEVEL);
          expect(o.level).toBeLessThanOrEqual(MAX_LEVEL);
          expect(o.passes).toBeGreaterThanOrEqual(0);
          expect(Math.abs(o.level - level)).toBeLessThanOrEqual(1);
          level = o.level;
          passes = o.passes;
        }
      }
    });
  }
});
