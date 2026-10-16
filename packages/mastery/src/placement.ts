/**
 * Placement test logic (docs/PLAN.md section 6.2, ADR 0003). Pure functions. Owner: Jhade (BB-47).
 *
 * The learner reads two to four calibrated stories, one try each, with no Learn button and no help.
 * After each story we update the ability estimate and pick the next story's level, then stop once
 * we are sure enough. The learner starts the main course slightly below the estimate so the first
 * stories feel doable.
 */
import type { PlacementFlag, PlacementResult, SubSkill } from '@basabridge/contracts';
import { PLACEMENT_RULE } from '@basabridge/levels';
import {
  guessFor,
  itemDifficulty,
  levelToTheta,
  prior,
  summarise,
  thetaToLevel,
  updatePosterior,
  type ItemEvidence,
  type Posterior,
} from './ability';

export function startLevelForGrade(grade: number | null | undefined): number {
  if (grade == null) return PLACEMENT_RULE.defaultStart;
  return PLACEMENT_RULE.gradeStart[Math.round(grade)] ?? PLACEMENT_RULE.defaultStart;
}

export interface PlacementAnswer {
  subskill?: SubSkill;
  type?: 'multiple_choice' | 'choose_all' | 'order_events';
  correct: boolean;
  /** Defaults to 1. Rushed answers count for less. */
  weight?: number;
}

export interface PlacementStory {
  level: number;
  answers: PlacementAnswer[];
  /** Share of words read right, when voice was available. */
  wordsRightShare?: number;
}

export interface PlacementState {
  startLevel: number;
  stories: PlacementStory[];
}

/** Belief about ability after the stories read so far. */
export function placementPosterior(state: PlacementState): Posterior {
  let p = prior(levelToTheta(state.startLevel), 1.5);
  for (const story of state.stories) {
    for (const a of story.answers) {
      const e: ItemEvidence = {
        difficulty: itemDifficulty(story.level, a.subskill),
        guess: guessFor(a.type),
        correct: a.correct,
        weight: a.weight,
      };
      p = updatePosterior(p, e);
    }
  }
  return p;
}

export interface NextPlacement {
  done: boolean;
  /** Level of the next story to show. null when done. */
  level: number | null;
  estimateLevel: number;
  sd: number;
}

/** Which story comes next, or whether the placement is finished. */
export function nextPlacement(state: PlacementState): NextPlacement {
  const s = summarise(placementPosterior(state));
  const estimateLevel = thetaToLevel(s.mean);
  const count = state.stories.length;
  const enough = count >= PLACEMENT_RULE.minStories && s.sd <= PLACEMENT_RULE.stopSd;
  if (count >= PLACEMENT_RULE.maxStories || enough) {
    return { done: true, level: null, estimateLevel, sd: s.sd };
  }
  const last = state.stories[count - 1]?.level ?? state.startLevel;
  const target = count === 0 ? state.startLevel : estimateLevel;
  const stepped = Math.max(
    last - PLACEMENT_RULE.maxStep,
    Math.min(last + PLACEMENT_RULE.maxStep, target),
  );
  return { done: false, level: Math.max(1, Math.min(100, stepped)), estimateLevel, sd: s.sd };
}

/**
 * Turn the finished placement into a starting level.
 * `voice` says whether the microphone was available. Without it the placement is flagged
 * and the learner is re-placed once voice is approved.
 */
export function finishPlacement(state: PlacementState, opts: { voice: boolean }): PlacementResult {
  const s = summarise(placementPosterior(state));
  const level = thetaToLevel(s.mean - PLACEMENT_RULE.conservative * s.sd);
  const flags: PlacementFlag[] = [];
  if (!opts.voice) flags.push('voice_missing');
  const shares = state.stories.map((x) => x.wordsRightShare).filter((x): x is number => x != null);
  const avgRight = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null;
  const lowDecoding = avgRight != null && avgRight < PLACEMENT_RULE.lowDecoding;
  if (lowDecoding) flags.push('low_decoding');
  if (state.stories.length < 3) flags.push('few_stories');
  // Without voice we cannot be fully sure, so cap the label at 'early'.
  const confidence = !opts.voice && s.confidence !== 'none' ? 'early' : s.confidence;
  return {
    level,
    theta: s.mean,
    sd: s.sd,
    confidence,
    storiesRead: state.stories.length,
    flags,
    recommendedHelp: level <= 20 || lowDecoding ? 'more' : 'standard',
  };
}
