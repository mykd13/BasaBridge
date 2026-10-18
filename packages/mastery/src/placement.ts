/**
 * Placement test logic (docs/PLAN.md section 6.2, ADR 0003). Pure functions. Owner: Jhade (BB-47).
 *
 * The learner reads two to four calibrated stories, one try each, with no Learn button and no help.
 * After each story we update the ability estimate and pick the next story's level, then stop once
 * we are sure enough. The learner starts the main course slightly below the estimate so the first
 * stories feel doable.
 */
import {
  QuestionType,
  SubSkill,
  type PlacementFlag,
  type PlacementResult,
} from '@basabridge/contracts';
import { MAX_LEVEL, MIN_LEVEL, PLACEMENT_RULE } from '@basabridge/levels';
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
  const minStories = Math.min(PLACEMENT_RULE.minStories, maxStories);
  const enough = count >= minStories && s.sd <= PLACEMENT_RULE.stopSd;
  if (count >= maxStories || enough) {
    return { done: true, level: null, estimateLevel, sd: s.sd };
  }
  const last = state.stories[count - 1]?.level ?? state.startLevel;
  const target = count === 0 ? state.startLevel : estimateLevel;
  const stepped = Math.max(
    last - PLACEMENT_RULE.maxStep,
    Math.min(last + PLACEMENT_RULE.maxStep, target),
  );
  return {
    done: false,
    level: Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, stepped)),
    estimateLevel,
    sd: s.sd,
  };
}

function recommendedHelp(level: number, lowDecoding: boolean): PlacementResult['recommendedHelp'] {
  return level <= 20 || lowDecoding ? 'more' : 'standard';
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
  const storiesRead = state.stories.length;
  if (storiesRead < 3) flags.push('few_stories');
  // Without voice we cannot be fully sure, so cap the label at 'early'.
  const confidence = !voiceUsed && s.confidence !== 'none' ? 'early' : s.confidence;
  return {
    level,
    theta: s.mean,
    sd: s.sd,
    confidence,
    storiesRead,
    flags,
    recommendedHelp: recommendedHelp(level, lowDecoding),
  };
}

// ---- sessions ----------------------------------------------------------------

/** `full` is a learner's placement. `recheck` is the short voice re-check after a silent one. */
export type PlacementKind = 'full' | 'recheck';

export interface PlacementStoryRead extends PlacementStory {
  /** Placement bank story, so a story is never read twice in one placement. */
  storyId: string;
}

/**
 * A placement in progress. Plain JSON, stored as `placement_sessions.progress` so a paused
 * placement resumes where it stopped.
 */
export interface PlacementSession extends PlacementState {
  kind: PlacementKind;
  /** Whether the microphone was available when the placement started. */
  voice: boolean;
  stories: PlacementStoryRead[];
}

/** The next step for a session: a re-check is shorter than a full placement. */
export function nextForSession(session: PlacementSession): NextPlacement {
  return session.kind === 'recheck' ? nextRecheck(session) : nextPlacement(session);
}

export type PlacementErrorCode = 'already_read' | 'too_far' | 'done' | 'not_done';

/** A story the server must not accept. The browser never decides these. */
export class PlacementError extends Error {
  constructor(readonly code: PlacementErrorCode) {
    super(`placement: ${code}`);
    this.name = 'PlacementError';
  }
}

export function startPlacement(opts: {
  grade: number | null | undefined;
  voice: boolean;
}): PlacementSession {
  return {
    kind: 'full',
    voice: opts.voice,
    startLevel: startLevelForGrade(opts.grade),
    stories: [],
  };
}

/**
 * Add one finished story: one try, no help. Rejects a story already read, one more than
 * `PLACEMENT_RULE.maxStep` levels from the last, and any story once the placement is done.
 */
export function recordPlacementStory(
  session: PlacementSession,
  story: PlacementStoryRead,
): PlacementSession {
  if (nextForSession(session).done) throw new PlacementError('done');
  if (session.stories.some((s) => s.storyId === story.storyId)) {
    throw new PlacementError('already_read');
  }
  const last = session.stories[session.stories.length - 1]?.level ?? session.startLevel;
  if (Math.abs(story.level - last) > PLACEMENT_RULE.maxStep) throw new PlacementError('too_far');
  return { ...session, stories: [...session.stories, story] };
}

/** The result, once `nextPlacement` says the placement is done. */
export function finishPlacementSession(session: PlacementSession): PlacementResult {
  if (!nextForSession(session).done) throw new PlacementError('not_done');
  return finishPlacement(session, { voice: session.voice });
}

/** What to store in `placement_sessions.progress`. */
export function placementProgress(session: PlacementSession): PlacementSession {
  return JSON.parse(JSON.stringify(session)) as PlacementSession;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isLevel = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= MIN_LEVEL && v <= MAX_LEVEL;
const isShare = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;

function parseAnswer(v: unknown): PlacementAnswer | null {
  if (!isRecord(v) || typeof v.correct !== 'boolean') return null;
  const a: PlacementAnswer = { correct: v.correct };
  if (v.subskill !== undefined) {
    const sub = SubSkill.safeParse(v.subskill);
    if (!sub.success) return null;
    a.subskill = sub.data;
  }
  if (v.type !== undefined) {
    const type = QuestionType.safeParse(v.type);
    if (!type.success) return null;
    a.type = type.data;
  }
  if (v.weight !== undefined) {
    if (!isShare(v.weight)) return null;
    a.weight = v.weight;
  }
  return a;
}

function parseStory(v: unknown): PlacementStoryRead | null {
  if (!isRecord(v) || typeof v.storyId !== 'string' || v.storyId === '') return null;
  if (!isLevel(v.level) || !Array.isArray(v.answers)) return null;
  const answers = v.answers.map(parseAnswer);
  if (answers.some((a) => a === null)) return null;
  const story: PlacementStoryRead = {
    storyId: v.storyId,
    level: v.level,
    answers: answers as PlacementAnswer[],
  };
  if (v.wordsRightShare !== undefined) {
    if (!isShare(v.wordsRightShare)) return null;
    story.wordsRightShare = v.wordsRightShare;
  }
  return story;
}

/**
 * Read stored progress back. Returns null when it is not a placement we could have written,
 * so a damaged row is never resumed with made-up evidence.
 */
export function parsePlacementProgress(value: unknown): PlacementSession | null {
  if (!isRecord(value)) return null;
  if (value.kind !== 'full' && value.kind !== 'recheck') return null;
  if (typeof value.voice !== 'boolean' || !isLevel(value.startLevel)) return null;
  if (!Array.isArray(value.stories)) return null;
  const stories = value.stories.map(parseStory);
  if (stories.some((s) => s === null)) return null;
  const read = stories as PlacementStoryRead[];
  if (new Set(read.map((s) => s.storyId)).size !== read.length) return null;
  const session: PlacementSession = {
    kind: value.kind,
    voice: value.voice,
    startLevel: value.startLevel,
    stories: read,
  };
  if (
    read.length >
    (session.kind === 'recheck' ? PLACEMENT_RULE.recheckStories : PLACEMENT_RULE.maxStories)
  ) {
    return null;
  }
  return session;
}

// ---- retake, skip and re-check ---------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** When a learner who finished a placement at `finishedAt` may take it again. */
export function retakeAvailableAt(finishedAt: Date): Date {
  return new Date(finishedAt.getTime() + PLACEMENT_RULE.retakeAfterDays * DAY_MS);
}

/** A learner who never finished a placement may take one now. */
export function canRetakePlacement(lastFinishedAt: Date | null, now: Date): boolean {
  return lastFinishedAt == null || now.getTime() >= retakeAvailableAt(lastFinishedAt).getTime();
}

/** A silent placement gets a short re-check once the learner's voice is approved. */
export function needsVoiceRecheck(result: PlacementResult, voiceApproved: boolean): boolean {
  return voiceApproved && result.flags.includes('voice_missing');
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
    recommendedHelp: recommendedHelp(level, false),
  };
}

/**
 * A short re-check once voice is approved after a silent placement. It starts at the level the
 * silent placement gave, and its result replaces it.
 */
export function startRecheck(previous: PlacementResult): PlacementState {
  return { startLevel: previous.level, stories: [] };
}

/** The re-check as a stored session, so its progress can be saved and resumed. */
export function startRecheckSession(previous: PlacementResult): PlacementSession {
  return { ...startRecheck(previous), kind: 'recheck', voice: true, stories: [] };
}

export function nextRecheck(state: PlacementState): NextPlacement {
  return nextPlacement(state, { maxStories: PLACEMENT_RULE.recheckStories });
}

export function finishRecheck(state: PlacementState): PlacementResult {
  return finishPlacement(state, { voice: true });
}
