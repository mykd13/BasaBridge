/**
 * Placement flow (BB-47, BB-49, docs/PLAN.md section 6.2). One try per story, no help, no Learn.
 * The ability maths is in packages/mastery. This file only runs the steps and keeps the records.
 */
import type { ComprehensionSkill } from '@basabridge/contracts';
import type {
  PlacementAnswerAck,
  PlacementAnswerRequest,
  PlacementGate,
  PlacementReadRequest,
  PlacementView,
} from '@basabridge/contracts/engine';
import { PLACEMENT_RULE } from '@basabridge/levels';
import {
  finishPlacement,
  levelToTheta,
  nextPlacement,
  placementPosterior,
  PLACEMENT_SUPPORTS,
  prior,
  startLevelForGrade,
  type PlacementState,
} from '@basabridge/mastery';
import { placementReadOutcome } from '@basabridge/speech';
import { EngineError } from './errors';
import { placementGate } from './gate';
import { emptyProgress } from './session';
import { scoreAnswer, toPublicQuestion } from './scoring';
import type {
  EngineDeps,
  LearnerProfile,
  LearnerProgress,
  PlacementRecord,
  PlacementStoryRecord,
  StoredStory,
} from './types';

async function profileOf(deps: EngineDeps, learnerId: string): Promise<LearnerProfile> {
  const profile = await deps.learners.getProfile(learnerId);
  if (!profile) throw new EngineError('not_configured');
  return profile;
}

async function ownedPlacement(
  deps: EngineDeps,
  learnerId: string,
  id: string,
): Promise<PlacementRecord> {
  const p = await deps.placements.get(id);
  if (!p || p.learnerId !== learnerId) throw new EngineError('placement_not_found');
  return p;
}

const current = (p: PlacementRecord): PlacementStoryRecord | undefined => p.stories.at(-1);

export function placementView(
  p: PlacementRecord,
  story: StoredStory | null,
  retryRead: boolean,
): PlacementView {
  const cur = current(p);
  return {
    id: p.id,
    status: p.status,
    voiceMode: p.voiceMode,
    storyNumber: Math.max(1, p.stories.length),
    maxStories: PLACEMENT_RULE.maxStories,
    story:
      p.status === 'done' || !story
        ? null
        : { id: story.id, title: story.title, text: story.text, words: story.words },
    supports: { ...PLACEMENT_SUPPORTS, learn: false },
    questions: p.status === 'answering' && story ? story.questions.map(toPublicQuestion) : [],
    answeredQuestionIds: cur ? cur.answers.map((a) => a.questionId) : [],
    retryRead,
    result: p.result,
    voiceRecheckDue: Boolean(p.result?.flags.includes('voice_missing')),
  };
}

async function viewOf(deps: EngineDeps, p: PlacementRecord): Promise<PlacementView> {
  const cur = current(p);
  const story = cur ? await deps.placementStories.get(cur.storyId) : null;
  const retryRead =
    p.status === 'reading' && cur !== undefined && cur.failures > 0 && cur.readStatus === 'pending';
  return placementView(p, story, retryRead);
}

export async function getPlacementGate(
  deps: EngineDeps,
  learnerId: string,
): Promise<PlacementGate> {
  return placementGate(await profileOf(deps, learnerId), deps.now());
}

/** The unfinished placement, for resuming after a reload. null when there is none. */
export async function getCurrentPlacement(
  deps: EngineDeps,
  learnerId: string,
): Promise<PlacementView | null> {
  await profileOf(deps, learnerId);
  const p = await deps.placements.findInProgress(learnerId);
  return p ? viewOf(deps, p) : null;
}

export async function getPlacement(
  deps: EngineDeps,
  learnerId: string,
  id: string,
): Promise<PlacementView> {
  await profileOf(deps, learnerId);
  return viewOf(deps, await ownedPlacement(deps, learnerId, id));
}

/** Start placement, or resume the unfinished one. A finished placement can be retaken after 30 days. */
export async function startPlacement(deps: EngineDeps, learnerId: string): Promise<PlacementView> {
  const profile = await profileOf(deps, learnerId);
  const existing = await deps.placements.findInProgress(learnerId);
  if (existing) return viewOf(deps, existing);
  const gate = placementGate(profile, deps.now());
  if (gate.state === 'completed' && !gate.canRetake) throw new EngineError('placement_done');

  // A retake starts from where the learner is now. A first placement starts from the grade.
  const startLevel =
    gate.state === 'completed' ? profile.progress.level : startLevelForGrade(profile.grade);
  const story = await deps.placementStories.pick({
    level: startLevel,
    focus: null,
    excludeStoryIds: [],
  });
  if (!story) throw new EngineError('no_story_available');
  const record: PlacementRecord = {
    id: deps.newId(),
    learnerId,
    startLevel,
    voiceMode: profile.micAllowed ? 'voice' : 'silent',
    status: 'reading',
    stories: [
      {
        storyId: story.id,
        level: story.level,
        readStatus: 'pending',
        failures: 0,
        wordsRightShare: null,
        answers: [],
      },
    ],
    result: null,
    version: 0,
    createdAt: deps.now(),
    finishedAt: null,
  };
  await deps.placements.create(record);
  await deps.learners.savePlacement(
    learnerId,
    {
      state: 'in_progress',
      finishedAt: profile.placement.finishedAt,
      result: profile.placement.result,
    },
    null,
  );
  return viewOf(deps, record);
}

/** Record the read of the story on screen. A failed recording is retried once, then the story is skipped. */
export async function submitPlacementRead(
  deps: EngineDeps,
  learnerId: string,
  id: string,
  req: PlacementReadRequest,
): Promise<PlacementView> {
  const profile = await profileOf(deps, learnerId);
  const p = await ownedPlacement(deps, learnerId, id);
  const cur = current(p);
  if (p.status !== 'reading' || !cur) throw new EngineError('session_wrong_state');

  if (req.mode === 'silent') {
    // A learner who may use the microphone cannot skip the read without saying why.
    if (p.voiceMode === 'voice' && !req.micState) throw new EngineError('voice_required');
    cur.readStatus = 'silent';
  } else {
    // The under-13 microphone gate is enforced here, not in the browser (AGENTS.md rule 5).
    if (!profile.micAllowed || p.voiceMode !== 'voice') throw new EngineError('mic_not_allowed');
    let outcome;
    if (req.mode === 'voice_failed') {
      cur.failures += 1;
      outcome = placementReadOutcome({ ok: false }, cur.failures);
    } else {
      const analysis = await deps.analyses.take(learnerId, req.captureId);
      if (!analysis) throw new EngineError('analysis_not_found');
      outcome = placementReadOutcome({ ok: true, analysis }, cur.failures + 1);
      // An unusable recording counts as a failure. A scored one does not.
      if (outcome.status !== 'scored') cur.failures += 1;
    }
    if (outcome.status === 'scored') {
      cur.readStatus = 'scored';
      cur.wordsRightShare = outcome.wordsRightShare;
    } else if (outcome.status === 'skipped') {
      cur.readStatus = 'skipped';
    } else {
      await deps.placements.save(p);
      return viewOf(deps, p);
    }
  }
  p.status = 'answering';
  await deps.placements.save(p);
  return viewOf(deps, p);
}

/** Score one placement answer. No feedback is returned: placement does not teach. */
export async function submitPlacementAnswer(
  deps: EngineDeps,
  learnerId: string,
  id: string,
  req: PlacementAnswerRequest,
): Promise<PlacementAnswerAck> {
  const profile = await profileOf(deps, learnerId);
  const p = await ownedPlacement(deps, learnerId, id);
  const cur = current(p);
  if (p.status !== 'answering' || !cur) throw new EngineError('session_wrong_state');
  const story = await deps.placementStories.get(cur.storyId);
  if (!story) throw new EngineError('no_story_available');
  const question = story.questions.find((q) => q.id === req.questionId);
  if (!question) throw new EngineError('question_not_found');
  if (cur.answers.some((a) => a.questionId === question.id)) {
    throw new EngineError('already_answered');
  }
  cur.answers.push(
    scoreAnswer({
      question,
      chosen: req.chosen,
      responseMs: req.responseMs,
      accommodations: [],
      supportedTry: false,
    }),
  );
  const finished = cur.answers.length >= story.questions.length ? await advance(deps, p) : null;
  // Save the placement first: a stale copy is rejected there, so a second tab cannot place twice.
  await deps.placements.save(p);
  if (finished)
    await deps.learners.savePlacement(profile.id, finished.placement, finished.progress);
  return { accepted: true, placement: await viewOf(deps, p) };
}

/** Build the mastery state from finished stories, which needs each story's question tags. */
async function masteryState(deps: EngineDeps, p: PlacementRecord): Promise<PlacementState> {
  const stories = [];
  for (const rec of p.stories) {
    if (rec.answers.length === 0) continue;
    const story = await deps.placementStories.get(rec.storyId);
    if (!story) throw new EngineError('no_story_available');
    stories.push({
      level: rec.level,
      wordsRightShare: rec.wordsRightShare ?? undefined,
      answers: rec.answers.map((a) => {
        const q = story.questions.find((x) => x.id === a.questionId);
        return { subskill: q?.subskill, type: q?.type, correct: a.correct, weight: a.weight };
      }),
    });
  }
  return { startLevel: p.startLevel, stories };
}

interface Finished {
  placement: LearnerProfile['placement'];
  progress: LearnerProgress;
}

/**
 * A story is finished: pick the next one or finish placement. Mutates `p`. When placement is
 * finished it returns what to write to the learner, for the caller to save after the placement.
 */
async function advance(deps: EngineDeps, p: PlacementRecord): Promise<Finished | null> {
  const state = await masteryState(deps, p);
  const next = nextPlacement(state);
  if (!next.done && next.level !== null) {
    const story = await deps.placementStories.pick({
      level: next.level,
      focus: null,
      excludeStoryIds: p.stories.map((s) => s.storyId),
    });
    if (story) {
      p.stories.push({
        storyId: story.id,
        level: story.level,
        readStatus: 'pending',
        failures: 0,
        wordsRightShare: null,
        answers: [],
      });
      p.status = 'reading';
      return null;
    }
    // The bank ran out: place on what we have rather than leave the learner stuck.
  }
  const result = finishPlacement(state, { voice: p.voiceMode === 'voice' });
  p.status = 'done';
  p.result = result;
  p.finishedAt = deps.now();

  const history = [];
  for (const rec of p.stories) {
    const story = await deps.placementStories.get(rec.storyId);
    history.push({
      questions: rec.answers.flatMap((a) => {
        const q = story?.questions.find((x) => x.id === a.questionId);
        return q ? [{ skill: q.skill as ComprehensionSkill, correct: a.correct }] : [];
      }),
    });
  }
  const progress: LearnerProgress = {
    level: result.level,
    passedStories: 0,
    recentWordsRight: [],
    posterior: placementPosterior(state),
    history,
  };
  return { placement: { state: 'completed', finishedAt: p.finishedAt, result }, progress };
}

/**
 * Skip placement. The learner starts at the grade default with low confidence and is asked again
 * (docs/PLAN.md section 6.2). Not allowed once placement is completed.
 */
export async function skipPlacement(deps: EngineDeps, learnerId: string): Promise<PlacementGate> {
  const profile = await profileOf(deps, learnerId);
  const gate = placementGate(profile, deps.now());
  // A skipped or finished placement already set the learner's level. Skipping again must not reset it.
  if (gate.state === 'completed' || gate.state === 'skipped') {
    throw new EngineError('placement_done');
  }
  const open = await deps.placements.findInProgress(learnerId);
  if (open) {
    open.status = 'done';
    open.finishedAt = deps.now();
    await deps.placements.save(open);
  }
  if (profile.placement.result) {
    // Abandoning a retake: the earlier result and the learner's progress stay as they are.
    const restored = { ...profile.placement, state: 'completed' as const };
    await deps.learners.savePlacement(learnerId, restored, null);
    return placementGate({ ...profile, placement: restored }, deps.now());
  }
  const level = startLevelForGrade(profile.grade);
  const progress: LearnerProgress = {
    ...emptyProgress(),
    level,
    posterior: prior(levelToTheta(level), 1.5),
  };
  await deps.learners.savePlacement(
    learnerId,
    { state: 'skipped', finishedAt: deps.now(), result: null },
    progress,
  );
  return placementGate(
    { ...profile, progress, placement: { state: 'skipped', finishedAt: deps.now(), result: null } },
    deps.now(),
  );
}
