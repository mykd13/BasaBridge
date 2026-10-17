/**
 * The learning engine on top of the ability model (docs/PLAN.md section 6, ADR 0003).
 * Keeps one posterior per comprehension skill and one for comprehension overall, chooses the
 * focus skill and decides level movement. Pure functions. Owner: Jhade (BB-19).
 */
import type { ComprehensionSkill, TryAnalysis } from '@basabridge/contracts';
import type { StoryResult } from '@basabridge/levels';
import {
  levelToTheta,
  prior,
  summarise,
  updatePosterior,
  type AbilitySummary,
  type ItemEvidence,
  type Posterior,
} from './ability';
import { COMPREHENSION_SKILLS } from './simple';

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

export function storyResult(
  t: TryAnalysis,
  answers: readonly { correct: boolean }[],
): StoryResult {
  return {
    wordsRightShare: readingMeasures(t).wordsRightShare,
    questionsCorrect: answers.filter((a) => a.correct).length,
    questionsTotal: answers.length,
  };
}
