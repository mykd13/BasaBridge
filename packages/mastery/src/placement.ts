/**
 * Placement test logic (docs/PLAN.md section 6.2, ADR 0003). Pure functions. Owner: Jhade (BB-47).
 *
 * The learner reads two to four calibrated stories, one try each, with no Learn button and no help.
 * After each story we update the ability estimate and pick the next story's level, then stop once
 * we are sure enough. The learner starts the main course slightly below the estimate so the first
 * stories feel doable.
 */
import type { PlacementFlag, PlacementResult, SubSkill } from '@basabridge/contracts';
import { PLACEMENT_BANK, PLACEMENT_RULE, placementStepFor } from '@basabridge/levels';
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

/** No help of any kind during placement (docs/PLAN.md section 6.2). Screens read this. */
export const PLACEMENT_SUPPORTS = {
  listenThenRead: false,
  wordTap: false,
  questionReadAloud: false,
} as const;

export type MicrophoneState = 'granted' | 'blocked' | 'unavailable' | 'not_allowed_yet';

/**
 * Whether placement runs with the learner's voice or silently.
 * `not_allowed_yet` is an under-13 learner without guardian approval (decided by the server).
 */
export function placementVoiceMode(mic: MicrophoneState): 'voice' | 'silent' {
  return mic === 'granted' ? 'voice' : 'silent';
}

export interface PlacementAnswer {
  subskill?: SubSkill;
  type?: 'multiple_choice' | 'choose_all' | 'order_events';
  correct: boolean;
  /** Defaults to 1. Rushed answers count for less. */
  weight?: number;
}

export interface PlacementStory {
  /** Bank story shown, so the same placement never shows it twice. Missing in older saved progress. */
  storyId?: string;
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

/** A reviewed placement story the bank can offer. */
export interface BankCandidate {
  id: string;
  level: number;
}

export interface ChooseBankStoryInput {
  /** Level from `nextPlacement`. */
  targetLevel: number;
  candidates: readonly BankCandidate[];
  /** Stories already shown in this placement. Never shown again. */
  shownThisPlacement: readonly string[];
  /** Stories shown in the learner's earlier placements. Used only when a step has nothing new. */
  shownBefore: readonly string[];
}

export interface BankChoice {
  storyId: string;
  level: number;
  /** True when the learner saw this story in an earlier placement. */
  reused: boolean;
}

/**
 * Pick the bank story for the next placement step (docs/PLAN.md section 6.2, BB-48).
 *
 * Prefers the target's step, then the nearest step that has a story, never further than
 * `PLACEMENT_RULE.maxStep` from the target. On a tie the lower step wins, so the story feels
 * doable. Within a step, a story the learner has never seen comes before one from an earlier
 * placement. A story shown in this placement is never chosen. Ties break by id, so the choice is
 * the same every time. Returns null when nothing fits.
 */
export function chooseBankStory(input: ChooseBankStoryInput): BankChoice | null {
  const shownNow = new Set(input.shownThisPlacement);
  const shownBefore = new Set(input.shownBefore);
  const target = placementStepFor(input.targetLevel);

  const byStep = new Map<number, BankCandidate[]>();
  for (const c of input.candidates) {
    if (shownNow.has(c.id)) continue;
    const step = placementStepFor(c.level);
    byStep.set(step, [...(byStep.get(step) ?? []), c]);
  }

  const { stepSize } = PLACEMENT_BANK;
  for (let distance = 0; distance <= PLACEMENT_RULE.maxStep; distance += stepSize) {
    const steps = distance === 0 ? [target] : [target - distance, target + distance];
    for (const step of steps) {
      const pool = byStep.get(step);
      if (!pool?.length) continue;
      const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      const pick = sorted.find((c) => !shownBefore.has(c.id)) ?? sorted[0];
      if (pick) return { storyId: pick.id, level: pick.level, reused: shownBefore.has(pick.id) };
    }
  }
  return null;
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
  const shares = state.stories.map((x) => x.wordsRightShare).filter((x): x is number => x != null);
  // Skipped reads have no share and are left out of the average, never counted as zero.
  // If voice was on but every read was skipped, we still have no voice evidence.
  const voiceUsed = opts.voice && shares.length > 0;
  if (!voiceUsed) flags.push('voice_missing');
  const avgRight = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null;
  const lowDecoding = avgRight != null && avgRight < PLACEMENT_RULE.lowDecoding;
  if (lowDecoding) flags.push('low_decoding');
  if (state.stories.length < 3) flags.push('few_stories');
  // Without voice we cannot be fully sure, so cap the label at 'early'.
  const confidence = !voiceUsed && s.confidence !== 'none' ? 'early' : s.confidence;
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
