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

/** Spread of the starting belief, before any placement story. */
const PRIOR_SD = 1.5;

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
  let p = prior(levelToTheta(state.startLevel), PRIOR_SD);
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

/**
 * Which story comes next, or whether the placement is finished.
 * `maxStories` shortens the run for the re-check; it defaults to the full placement.
 */
export function nextPlacement(
  state: PlacementState,
  opts: { maxStories?: number } = {},
): NextPlacement {
  const maxStories = opts.maxStories ?? PLACEMENT_RULE.maxStories;
  const s = summarise(placementPosterior(state));
  const estimateLevel = thetaToLevel(s.mean);
  const count = state.stories.length;
  const enough = count >= PLACEMENT_RULE.minStories && s.sd <= PLACEMENT_RULE.stopSd;
  if (count >= maxStories || enough) {
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

/**
 * "Do this later": start at the grade default with no evidence. Placement is offered again at the
 * next sign-in (see `placementGate`).
 */
export function skipPlacement(grade: number | null | undefined): PlacementResult {
  const level = startLevelForGrade(grade);
  return {
    level,
    theta: levelToTheta(level),
    sd: PRIOR_SD,
    confidence: PLACEMENT_RULE.skipConfidence,
    storiesRead: 0,
    flags: [],
    recommendedHelp: level <= 20 ? 'more' : 'standard',
  };
}

/**
 * A short re-check once voice is approved after a silent placement. It starts at the level the
 * silent placement gave, and its result replaces it.
 */
export function startRecheck(previous: PlacementResult): PlacementState {
  // `previous.level` already sits `conservative` deviations below the estimate, and finishing the
  // re-check lowers it again. Start from the estimate itself so the offset is applied once.
  return { startLevel: thetaToLevel(previous.theta), stories: [] };
}

export function nextRecheck(state: PlacementState): NextPlacement {
  return nextPlacement(state, { maxStories: PLACEMENT_RULE.recheckStories });
}

/**
 * The re-check is offered once. Its result never carries `voice_missing`, even when every read was
 * skipped, so the gate does not offer the re-check again and lock the learner out of the course.
 */
export function finishRecheck(state: PlacementState): PlacementResult {
  const r = finishPlacement(state, { voice: true });
  return { ...r, flags: r.flags.filter((f) => f !== 'voice_missing') };
}

/** A skipped placement has no stories behind it. `skipPlacement` is the only source of such a result. */
export function isSkippedPlacement(r: PlacementResult): boolean {
  return r.storiesRead === 0 && r.confidence === PLACEMENT_RULE.skipConfidence;
}
