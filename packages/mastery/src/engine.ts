/**
 * The learning engine on top of the ability model (docs/PLAN.md section 6, ADR 0003).
 * Keeps one posterior per comprehension skill and one for comprehension overall, chooses the
 * focus skill and decides level movement. Pure functions. Owner: Jhade (BB-19).
 */
import type { ComprehensionSkill, TryAnalysis } from '@basabridge/contracts';
import { isPass, isVeryWeak, type StoryResult } from '@basabridge/levels';
import {
  levelReadiness,
  levelToTheta,
  prior,
  summarise,
  updatePosterior,
  type AbilitySummary,
  type ItemEvidence,
  type Posterior,
  type Readiness,
} from './ability';
import { COMPREHENSION_SKILLS, moveLevel } from './simple';

/** Matches ability_estimates.scope. */
export type AbilityScope = 'comprehension' | ComprehensionSkill;
export const ABILITY_SCOPES: readonly AbilityScope[] = ['comprehension', ...COMPREHENSION_SKILLS];

export type AbilityState = Record<AbilityScope, Posterior>;
export type AbilitySummaries = Record<AbilityScope, AbilitySummary>;

/** Stored posteriors, with a prior at the learner's level for any scope not stored yet. */
export function startingState(level: number, stored: Partial<AbilityState>): AbilityState {
  return Object.fromEntries(
    ABILITY_SCOPES.map((s) => [s, stored[s] ?? prior(levelToTheta(level))]),
  ) as AbilityState;
}

/** One answer updates its own skill and comprehension overall. */
export function updateAbility(
  state: AbilityState,
  skill: ComprehensionSkill,
  e: ItemEvidence,
): AbilityState {
  return {
    ...state,
    [skill]: updatePosterior(state[skill], e),
    comprehension: updatePosterior(state.comprehension, e),
  };
}

export function summariseAll(state: AbilityState): AbilitySummaries {
  return Object.fromEntries(
    ABILITY_SCOPES.map((s) => [s, summarise(state[s])]),
  ) as AbilitySummaries;
}

/**
 * Focus skill: the measured skill with the lowest estimate. Ties go to the less certain one.
 * Chosen by code only. The AI words the explanation and never picks or changes it.
 */
export function focusFromAbility(s: AbilitySummaries): ComprehensionSkill | null {
  const measured = COMPREHENSION_SKILLS.filter((k) => s[k].items > 0);
  measured.sort((a, b) => {
    const d = s[a].mean - s[b].mean;
    // Treat floating-point noise as a tie, so equal estimates fall through to the spread.
    return Math.abs(d) > 1e-9 ? d : s[b].sd - s[a].sd;
  });
  return measured[0] ?? null;
}

/** Decoding and fluency come from the counted try. */
export interface ReadingMeasures {
  wordsRightShare: number;
  wordsPerMinute: number;
}

export function readingMeasures(t: TryAnalysis): ReadingMeasures {
  return {
    wordsRightShare: t.wordsTotal > 0 ? Math.min(1, t.wordsRight / t.wordsTotal) : 0,
    wordsPerMinute: t.wordsPerMinute,
  };
}

export function storyResult(t: TryAnalysis, answers: readonly { correct: boolean }[]): StoryResult {
  return {
    wordsRightShare: readingMeasures(t).wordsRightShare,
    questionsCorrect: answers.filter((a) => a.correct).length,
    questionsTotal: answers.length,
  };
}

/** 'ability' is the default. 'simple' is the old three-passes rule, kept as a fallback. */
export type MasteryModel = 'ability' | 'simple';

export interface LevelInput {
  /** The learner's current level. */
  level: number;
  /** The level of the story just finished. A story at another level never moves the level. */
  storyLevel: number;
  /** learners.level_passes: stories passed at the current level. */
  passes: number;
  result: StoryResult;
  comprehension: Posterior;
  /** Words-right shares of counted tries, newest last, including this story's. */
  recentWordsRight: readonly number[];
  model: MasteryModel;
}

export interface LevelOutcome {
  level: number;
  passes: number;
  moved: 'up' | 'down' | 'none';
  passed: boolean;
  model: MasteryModel;
  /** Null under the simple model, and when the story gave no evidence. */
  readiness: Readiness | null;
}

/**
 * Level movement rests on evidence from this story (golden rule 10). A story with no answers, or
 * one written for another level than the learner's, adds no evidence: no pass counts and the
 * level stays. Up also needs a pass, and down needs a story that was not passed, so a passed
 * story never costs a level.
 */
export function decideLevel(i: LevelInput): LevelOutcome {
  const passed = isPass(i.result);
  if (i.result.questionsTotal === 0 || i.storyLevel !== i.level) {
    return {
      level: i.level,
      passes: i.passes,
      moved: 'none',
      passed: i.result.questionsTotal === 0 ? false : passed,
      model: i.model,
      readiness: null,
    };
  }
  if (i.model === 'simple') {
    const m = moveLevel({ level: i.level, passes: i.passes }, passed, isVeryWeak(i.result));
    return { ...m, passed, model: 'simple', readiness: null };
  }
  const passes = passed ? i.passes + 1 : i.passes;
  const readiness = levelReadiness(i.comprehension, i.level, {
    // Simplification: every comprehension item counts, not only those at or above this level.
    items: i.comprehension.items,
    passedStories: passes,
    recentWordsRight: [...i.recentWordsRight],
  });
  const base = { passed, model: 'ability' as const, readiness };
  if (readiness.up && passed) return { ...base, level: i.level + 1, passes: 0, moved: 'up' };
  if (readiness.down && !passed) return { ...base, level: i.level - 1, passes: 0, moved: 'down' };
  return { ...base, level: i.level, passes, moved: 'none' };
}
