/**
 * Reading session orchestration (BB-36). Start, read tries, the counted try, resume, answering
 * and finishing, and a new story at the same difficulty.
 *
 * Rules that live here are only the flow. The numbers (tries per level, the pass rule, evidence
 * weights, level movement) come from packages/levels and packages/mastery.
 */
import type { ComprehensionSkill } from '@basabridge/contracts';
import type {
  AnswerFeedback,
  SessionResult,
  SessionView,
  SubmitAnswerRequest,
  SubmitTryRequest,
} from '@basabridge/contracts/engine';
import { shouldOfferLearn } from '@basabridge/learn';
import {
  hasTriesLeft,
  isPass,
  isSupportedTry,
  listenThenReadAllowed,
  STARTING_LEVEL,
  triesFor,
} from '@basabridge/levels';
import {
  applyReadiness,
  estimateSkills,
  focusSkill,
  guessFor,
  itemDifficulty,
  levelReadiness,
  levelToTheta,
  prior,
  updatePosterior,
  type ItemEvidence,
  type Posterior,
} from '@basabridge/mastery';
import { EngineError } from './errors';
import { placementGate } from './gate';
import { keyIndexes, scoreAnswer, toPublicQuestion } from './scoring';
import type {
  EngineDeps,
  LearnerProfile,
  LearnerProgress,
  SessionRecord,
  StoredStory,
  TryEntry,
} from './types';

const RECENT_STORIES = 10;
const HISTORY_CAP = 20;
const RECENT_WORDS_CAP = 5;

export function emptyProgress(): LearnerProgress {
  return {
    level: STARTING_LEVEL,
    passedStories: 0,
    recentWordsRight: [],
    posterior: null,
    history: [],
  };
}

async function profileOf(deps: EngineDeps, learnerId: string): Promise<LearnerProfile> {
  const profile = await deps.learners.getProfile(learnerId);
  if (!profile) throw new EngineError('not_configured');
  return profile;
}

/** The session, only if it belongs to this learner. Anything else looks like "not found". */
async function ownedSession(
  deps: EngineDeps,
  learnerId: string,
  sessionId: string,
): Promise<SessionRecord> {
  const s = await deps.sessions.get(sessionId);
  if (!s || s.learnerId !== learnerId) throw new EngineError('session_not_found');
  return s;
}

async function storyOf(deps: EngineDeps, storyId: string): Promise<StoredStory> {
  const story = await deps.stories.get(storyId);
  if (!story) throw new EngineError('no_story_available');
  return story;
}

/** The try that counts: the best completed try, ties to the latest. Needs-review tries come last. */
export function bestTry(tries: TryEntry[]): TryEntry | null {
  const done = tries.filter((t) => t.completed);
  let best: TryEntry | null = null;
  const rank = (t: TryEntry) => (t.needsReview ? -2 : (t.wordsRightShare ?? -1));
  for (const t of done) {
    if (!best || rank(t) >= rank(best)) best = t;
  }
  return best;
}

function triesLeftOf(s: SessionRecord): number | null {
  return s.triesAllowed === null ? null : Math.max(0, s.triesAllowed - s.tries.length);
}

function nextOf(s: SessionRecord): SessionView['next'] {
  if (s.status === 'done') return 'new_story';
  if (s.status === 'answering') return 'answer';
  return s.tries.some((t) => t.completed) ? 'read_or_continue' : 'read';
}

export function sessionView(
  s: SessionRecord,
  story: StoredStory,
  profile: LearnerProfile,
  now: Date,
): SessionView {
  const gate = placementGate(profile, now);
  const left = triesLeftOf(s);
  return {
    id: s.id,
    status: s.status,
    next: nextOf(s),
    level: s.level,
    story: { id: story.id, title: story.title, text: story.text, words: story.words },
    voiceMode: s.voiceMode,
    triesAllowed: s.triesAllowed,
    triesUsed: s.tries.length,
    triesLeft: left,
    countedTryId: s.countedTryId,
    tries: s.tries.map((t) => ({
      id: t.id,
      completed: t.completed,
      wordsRightShare: t.wordsRightShare,
      supported: t.supported,
    })),
    listenThenRead:
      s.status === 'reading' &&
      listenThenReadAllowed({
        level: s.level,
        inPlacement: false,
        enabled: profile.listenThenReadEnabled,
      }),
    questions: s.status === 'answering' ? story.questions.map(toPublicQuestion) : [],
    answeredQuestionIds: s.answers.map((a) => a.questionId),
    result: s.result,
    placementDue: gate.due,
  };
}

async function view(deps: EngineDeps, s: SessionRecord, profile: LearnerProfile) {
  return sessionView(s, await storyOf(deps, s.storyId), profile, deps.now());
}

async function createSession(
  deps: EngineDeps,
  profile: LearnerProfile,
  level: number,
): Promise<SessionRecord> {
  const focus = focusSkill(estimateSkills(profile.progress.history));
  const exclude = await deps.sessions.recentStoryIds(profile.id, RECENT_STORIES);
  const story = await deps.stories.pick({ level, focus, excludeStoryIds: exclude });
  if (!story) throw new EngineError('no_story_available');
  const record: SessionRecord = {
    id: deps.newId(),
    learnerId: profile.id,
    storyId: story.id,
    level,
    voiceMode: profile.micAllowed ? 'voice' : 'silent',
    triesAllowed: triesFor(level),
    tries: [],
    countedTryId: null,
    status: 'reading',
    answers: [],
    inlineOffersShown: 0,
    result: null,
    version: 0,
    createdAt: deps.now(),
  };
  await deps.sessions.create(record);
  return record;
}

/** The learner's unfinished session, for resuming after a reload. null when there is none. */
export async function getCurrentSession(
  deps: EngineDeps,
  learnerId: string,
): Promise<SessionView | null> {
  const profile = await profileOf(deps, learnerId);
  const active = await deps.sessions.findActive(learnerId);
  return active ? view(deps, active, profile) : null;
}

export async function getSession(
  deps: EngineDeps,
  learnerId: string,
  sessionId: string,
): Promise<SessionView> {
  const profile = await profileOf(deps, learnerId);
  return view(deps, await ownedSession(deps, learnerId, sessionId), profile);
}

/**
 * Start a session at the learner's level, or resume the unfinished one. Locked until placement is
 * done or skipped (BB-49).
 */
export async function startSession(deps: EngineDeps, learnerId: string): Promise<SessionView> {
  const profile = await profileOf(deps, learnerId);
  if (placementGate(profile, deps.now()).required) throw new EngineError('placement_required');
  const active = await deps.sessions.findActive(learnerId);
  if (active) return view(deps, active, profile);
  return view(deps, await createSession(deps, profile, profile.progress.level), profile);
}

/** After a finished session: a new story at the learner's level, which is the same difficulty unless evidence moved it. */
export async function newStory(
  deps: EngineDeps,
  learnerId: string,
  sessionId: string,
): Promise<SessionView> {
  const profile = await profileOf(deps, learnerId);
  const previous = await ownedSession(deps, learnerId, sessionId);
  if (previous.status !== 'done') throw new EngineError('session_wrong_state');
  if (placementGate(profile, deps.now()).required) throw new EngineError('placement_required');
  const active = await deps.sessions.findActive(learnerId);
  if (active) return view(deps, active, profile);
  return view(deps, await createSession(deps, profile, profile.progress.level), profile);
}

/** Record one read try. Only a try that reaches the end can count (docs/PLAN.md section 6). */
export async function submitTry(
  deps: EngineDeps,
  learnerId: string,
  sessionId: string,
  req: SubmitTryRequest,
): Promise<SessionView> {
  const profile = await profileOf(deps, learnerId);
  const s = await ownedSession(deps, learnerId, sessionId);
  if (s.status !== 'reading') throw new EngineError('session_wrong_state');
  if (!hasTriesLeft(s.level, s.tries.length)) throw new EngineError('no_tries_left');

  let completed = true;
  let share: number | null = null;
  let wpm = 0;
  let needsReview = false;
  if (req.mode === 'silent' && s.voiceMode === 'voice' && !req.micState) {
    // A learner who may use the microphone cannot skip the read without saying why.
    throw new EngineError('voice_required');
  }
  if (req.mode === 'voice') {
    // The under-13 microphone gate is enforced here, not in the browser (AGENTS.md rule 5).
    if (!profile.micAllowed || s.voiceMode !== 'voice') throw new EngineError('mic_not_allowed');
    const analysis = await deps.analyses.take(learnerId, req.captureId);
    if (!analysis) throw new EngineError('analysis_not_found');
    completed = analysis.completed;
    share =
      analysis.wordsTotal > 0
        ? Math.min(1, Math.max(0, analysis.wordsRight / analysis.wordsTotal))
        : 0;
    wpm = Math.round(analysis.wordsPerMinute);
    needsReview = analysis.checks?.review === 'needs_review';
  }
  const supported = isSupportedTry({
    level: s.level,
    inPlacement: false,
    enabled: profile.listenThenReadEnabled,
    listened: req.listened,
  });
  s.tries.push({
    id: deps.newId(),
    completed,
    wordsRightShare: share,
    wordsPerMinute: wpm,
    supported,
    needsReview,
    createdAt: deps.now(),
  });

  let closed: Closed | null = null;
  if (triesLeftOf(s) === 0) {
    // Tries are used up: the best try counts. With no finished try, the story ends as stopped early.
    const best = bestTry(s.tries);
    if (best) {
      s.countedTryId = best.id;
      s.status = 'answering';
    } else {
      // No questions were answered, so no story is needed to close the session.
      closed = finish(deps, s, profile, null);
    }
  }
  await commit(deps, s, closed);
  return view(deps, s, profile);
}

/** The learner is happy with a finished try and goes to the questions. */
export async function continueToQuestions(
  deps: EngineDeps,
  learnerId: string,
  sessionId: string,
): Promise<SessionView> {
  const profile = await profileOf(deps, learnerId);
  const s = await ownedSession(deps, learnerId, sessionId);
  if (s.status !== 'reading') throw new EngineError('session_wrong_state');
  const best = bestTry(s.tries);
  if (!best) throw new EngineError('no_completed_try');
  s.countedTryId = best.id;
  s.status = 'answering';
  await commit(deps, s, null);
  return view(deps, s, profile);
}

/** Score one answer on the server. The last answer finishes the session and returns the result. */
export async function submitAnswer(
  deps: EngineDeps,
  learnerId: string,
  sessionId: string,
  req: SubmitAnswerRequest,
): Promise<AnswerFeedback> {
  const profile = await profileOf(deps, learnerId);
  const s = await ownedSession(deps, learnerId, sessionId);
  if (s.status !== 'answering') throw new EngineError('session_wrong_state');
  const story = await storyOf(deps, s.storyId);
  const question = story.questions.find((q) => q.id === req.questionId);
  if (!question) throw new EngineError('question_not_found');
  if (s.answers.some((a) => a.questionId === question.id)) {
    throw new EngineError('already_answered');
  }
  // The server records supported_try itself. Word tap is for after a try, never while answering.
  if (req.accommodations.some((a) => a !== 'question_read_aloud')) {
    throw new EngineError('accommodation_not_allowed');
  }
  const counted = s.tries.find((t) => t.id === s.countedTryId);
  const entry = scoreAnswer({
    question,
    chosen: req.chosen,
    responseMs: req.responseMs,
    accommodations: req.accommodations,
    supportedTry: counted?.supported ?? false,
  });
  s.answers.push(entry);

  const wrong = s.answers.filter((a) => !a.correct).length;
  const offer = shouldOfferLearn({
    wrongAnswers: wrong,
    inlineOffersShown: s.inlineOffersShown,
    passed: false,
  });
  const offerLearn = !entry.correct && offer.inline;
  if (offerLearn) s.inlineOffersShown += 1;

  let closed: Closed | null = null;
  if (s.answers.length >= story.questions.length) closed = finish(deps, s, profile, story);
  await commit(deps, s, closed);
  return {
    correct: entry.correct,
    correctIndexes: keyIndexes(question.key),
    evidence: question.evidence,
    offerLearn,
    result: closed?.result ?? null,
  };
}

interface Closed {
  result: SessionResult;
  /** New progress to save, or null when the session ended without evidence. */
  progress: LearnerProgress | null;
}

/**
 * Save the session first. A stale copy is rejected there (`conflict`), so a second tab cannot
 * apply the same result to the learner's progress twice. Progress is written only after that.
 */
async function commit(deps: EngineDeps, s: SessionRecord, closed: Closed | null): Promise<void> {
  await deps.sessions.save(s);
  if (closed?.progress) await deps.learners.saveProgress(s.learnerId, closed.progress);
}

/**
 * Close the session: pass rule from packages/levels, ability update and level movement from
 * packages/mastery. Mutates `s` (status, result). The caller saves the session, then the progress.
 */
function finish(
  _deps: EngineDeps,
  s: SessionRecord,
  profile: LearnerProfile,
  story: StoredStory | null,
): Closed {
  const progress = profile.progress;
  const before = progress.level;
  s.status = 'done';

  const counted = s.tries.find((t) => t.id === s.countedTryId) ?? null;
  if (!counted || !story) {
    const result: SessionResult = {
      outcome: 'stopped_early',
      wordsRightShare: null,
      questionsCorrect: 0,
      questionsTotal: 0,
      levelBefore: before,
      levelAfter: before,
      moved: 'none',
      focusSkill: focusSkill(estimateSkills(progress.history)),
      nextStoryLevel: before,
      learn: { onResult: false },
      voiceEvidence: false,
    };
    s.result = result;
    return { result, progress: null };
  }

  const total = story.questions.length;
  const correct = s.answers.filter((a) => a.correct).length;
  const share = counted.wordsRightShare;
  // A silent read has no words-right evidence: the story is judged on the questions alone.
  const passed = isPass({
    wordsRightShare: share ?? 1,
    questionsCorrect: correct,
    questionsTotal: total,
  });
  const voiceEvidence = share !== null && !counted.needsReview;

  let posterior: Posterior = progress.posterior ?? prior(levelToTheta(progress.level), 1.5);
  for (const a of s.answers) {
    const q = story.questions.find((x) => x.id === a.questionId);
    if (!q) continue;
    const e: ItemEvidence = {
      difficulty: q.difficulty ?? itemDifficulty(story.level, q.subskill),
      guess: guessFor(q.type),
      correct: a.correct,
      weight: a.weight,
    };
    posterior = updatePosterior(posterior, e);
  }

  const passedStories = progress.passedStories + (passed ? 1 : 0);
  const recent = voiceEvidence
    ? [...progress.recentWordsRight, share].slice(-RECENT_WORDS_CAP)
    : progress.recentWordsRight;
  const readiness = levelReadiness(posterior, before, {
    items: posterior.items,
    passedStories,
    recentWordsRight: recent,
  });
  // The move itself (one level, inside the table) is decided in packages/mastery.
  const { level, moved } = applyReadiness(before, readiness);

  const history = [
    ...progress.history,
    {
      questions: s.answers.flatMap((a) => {
        const q = story.questions.find((x) => x.id === a.questionId);
        return q ? [{ skill: q.skill as ComprehensionSkill, correct: a.correct }] : [];
      }),
    },
  ].slice(-HISTORY_CAP);

  const next: LearnerProgress = {
    level,
    passedStories: moved === 'none' ? passedStories : 0,
    recentWordsRight: moved === 'none' ? recent : [],
    posterior,
    history,
  };
  profile.progress = next;

  const result: SessionResult = {
    outcome: passed ? 'passed' : 'not_passed',
    wordsRightShare: share,
    questionsCorrect: correct,
    questionsTotal: total,
    levelBefore: before,
    levelAfter: level,
    moved,
    focusSkill: focusSkill(estimateSkills(history)),
    nextStoryLevel: level,
    learn: {
      onResult: shouldOfferLearn({
        wrongAnswers: total - correct,
        inlineOffersShown: s.inlineOffersShown,
        passed,
      }).onResult,
    },
    voiceEvidence,
  };
  s.result = result;
  return { result, progress: next };
}
