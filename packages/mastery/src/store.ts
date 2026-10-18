/**
 * The only I/O in mastery, through an interface. A Drizzle adapter lives with the database
 * client and reads learner data through the authorization layer (BB-10). A finished story is
 * applied in one transaction: its answers, the estimates, the level, its passes and the decision
 * rows are saved together, and a session already applied is skipped. Owner: Jhade (BB-19).
 */
import type { ComprehensionSkill, Decision, TryAnalysis } from '@basabridge/contracts';
import { EVIDENCE_RULE, type StoryResult } from '@basabridge/levels';
import { summarise, temper, type AbilitySummary, type Posterior } from './ability';
import { scoreAnswer, toItemEvidence, type AnswerInput } from './answer-evidence';
import { analysisDecision, compactEstimates, focusDecision, levelDecision } from './decisions';
import {
  decideLevel,
  focusFromAbility,
  readingMeasures,
  startingState,
  storyResult,
  summariseAll,
  updateAbility,
  type AbilityScope,
  type AbilityState,
  type AbilitySummaries,
  type LevelOutcome,
  type MasteryModel,
  type ReadingMeasures,
} from './engine';
import { estimateSkills, focusSkill, type StoryAnswers } from './simple';

/**
 * One transaction's view of the data. A Drizzle adapter is built per request around the acting
 * user, so every read and write goes through the authorization layer (BB-10, golden rule 4).
 */
export interface MasteryTx {
  /**
   * learners.level and learners.level_passes. The adapter locks the learner row (FOR UPDATE) until
   * the transaction ends, so two story finishes at once cannot lose an update to ability_estimates
   * or count the same session twice.
   */
  getLearner(learnerId: string): Promise<{ level: number; passes: number }>;
  /**
   * True when an 'analysis' decision for this session exists (evidence.sessionId). Read after
   * getLearner, under its lock.
   */
  hasStoryResult(learnerId: string, sessionId: string): Promise<boolean>;
  /** ability_estimates rows by scope. startingState checks each row and throws on a bad one. */
  getAbility(learnerId: string): Promise<Partial<AbilityState>>;
  saveAbility(
    learnerId: string,
    scope: AbilityScope,
    posterior: Posterior,
    summary: AbilitySummary,
  ): Promise<void>;
  /**
   * answers.rushed and answers.weight. The adapter updates only an answer in this session of this
   * learner, and fails if there is none.
   */
  saveAnswerWeight(
    learnerId: string,
    sessionId: string,
    answerId: string,
    w: { rushed: boolean; weight: number },
  ): Promise<void>;
  /**
   * Summed answers.weight of this learner's answers in earlier finished sessions whose story level
   * is at least `minStoryLevel` (answers to reading_sessions to stories.level).
   */
  getLevelEvidence(
    learnerId: string,
    opts: { minStoryLevel: number; excludeSessionId: string },
  ): Promise<number>;
  /**
   * Words-right shares (words_right / words_total) of the counted tries of earlier finished
   * sessions, newest last. Tries with words_total = 0 are skipped.
   */
  getRecentWordsRight(
    learnerId: string,
    opts: { excludeSessionId: string; limit: number },
  ): Promise<number[]>;
  /** Earlier finished stories' answers, oldest first, excluding this session. Simple model only. */
  getAnswerHistory(learnerId: string, opts: { excludeSessionId: string }): Promise<StoryAnswers[]>;
  /**
   * Focus from the newest 'plan' decision whose evidence.to is a ComprehensionSkill, or null.
   * Plan rows with any other shape (other writers) are skipped.
   */
  getLastFocus(learnerId: string): Promise<ComprehensionSkill | null>;
  setLearnerLevel(learnerId: string, s: { level: number; passes: number }): Promise<void>;
  addDecision(learnerId: string, d: Decision): Promise<void>;
}

export interface MasteryStore {
  /** Runs `fn` atomically: every write commits, or none does. */
  transaction<T>(fn: (tx: MasteryTx) => Promise<T>): Promise<T>;
}

export interface ApplyStoryInput {
  learnerId: string;
  sessionId: string;
  storyLevel: number;
  countedTry: TryAnalysis;
  /**
   * Every stored answer of this session. Only answers to a real story's questions: Learn practice
   * never goes through mastery, so it never changes a level (golden rule 10).
   */
  answers: readonly AnswerInput[];
  model?: MasteryModel;
}

export interface StoryOutcome {
  applied: true;
  level: LevelOutcome;
  focus: ComprehensionSkill | null;
  /** Estimates after this story's answers, before fading. These drove the decisions. */
  summaries: AbilitySummaries;
  measures: ReadingMeasures;
  result: StoryResult;
  decisions: Decision[];
}

/** The session was applied before. Nothing was written. */
export interface AlreadyApplied {
  applied: false;
}

/** levelReadiness reads the last `recentTries` counted tries; this story's is one of them. */
const EARLIER_TRIES = EVIDENCE_RULE.up.recentTries - 1;

const isShare = (x: number) => Number.isFinite(x) && x >= 0 && x <= 1;

/**
 * Call once per finished session of a real story. Applies every answer to the estimates, saves
 * each answer's weight, decides the level and the focus skill, writes the decision rows and then
 * fades the stored estimates (EVIDENCE_RULE.storyDecay). All in one transaction.
 * Safe to retry: a session that was already applied returns { applied: false } and writes nothing.
 */
export function applyStoryResult(
  store: MasteryStore,
  i: ApplyStoryInput,
): Promise<StoryOutcome | AlreadyApplied> {
  const model = i.model ?? 'ability';
  return store.transaction(async (tx): Promise<StoryOutcome | AlreadyApplied> => {
    const learner = await tx.getLearner(i.learnerId);
    if (await tx.hasStoryResult(i.learnerId, i.sessionId)) return { applied: false };

    const stored = await tx.getAbility(i.learnerId);
    let state = startingState(learner.level, stored);
    const scored = i.answers.map((a) => scoreAnswer(a, i.storyLevel));
    const touched = new Set<AbilityScope>(Object.keys(stored) as AbilityScope[]);
    for (const a of scored) {
      state = updateAbility(state, a.skill, toItemEvidence(a));
      touched.add(a.skill).add('comprehension');
      await tx.saveAnswerWeight(i.learnerId, i.sessionId, a.answerId, {
        rushed: a.rushed,
        weight: a.weight,
      });
    }
    const summaries = summariseAll(state);

    const measures = readingMeasures(i.countedTry);
    const result = storyResult(i.countedTry, scored);
    const earlier = (
      await tx.getRecentWordsRight(i.learnerId, {
        excludeSessionId: i.sessionId,
        limit: EARLIER_TRIES,
      })
    ).filter(isShare);
    const recentWordsRight = [...earlier, measures.wordsRightShare];
    let levelItems = 0;
    if (model === 'ability') {
      const thisStory =
        i.storyLevel >= learner.level ? scored.reduce((sum, a) => sum + a.weight, 0) : 0;
      const before = await tx.getLevelEvidence(i.learnerId, {
        minStoryLevel: learner.level,
        excludeSessionId: i.sessionId,
      });
      levelItems = thisStory + before;
    }

    const level = decideLevel({
      level: learner.level,
      storyLevel: i.storyLevel,
      passes: learner.passes,
      result,
      comprehension: state.comprehension,
      levelItems,
      recentWordsRight,
      model,
    });
    await tx.setLearnerLevel(i.learnerId, { level: level.level, passes: level.passes });

    const lastFocus = await tx.getLastFocus(i.learnerId);
    let focus: ComprehensionSkill | null;
    let estimates: Record<string, unknown>;
    if (model === 'simple') {
      const history = await tx.getAnswerHistory(i.learnerId, { excludeSessionId: i.sessionId });
      const simple = estimateSkills([
        ...history,
        { questions: scored.map((a) => ({ skill: a.skill, correct: a.correct })) },
      ]);
      focus = focusSkill(simple);
      estimates = simple;
    } else {
      focus = focusFromAbility(summaries, lastFocus);
      estimates = compactEstimates(summaries);
    }

    const decisions: Decision[] = [analysisDecision(i.sessionId, scored, summaries, measures)];
    if (level.moved !== 'none') {
      decisions.push(
        levelDecision({
          fromLevel: learner.level,
          outcome: level,
          comprehension: summaries.comprehension,
          levelItems,
          measures,
          result,
          recentWordsRight,
        }),
      );
    }
    if (focus !== null && focus !== lastFocus) {
      decisions.push(focusDecision(lastFocus, focus, estimates, model));
    }
    for (const d of decisions) await tx.addDecision(i.learnerId, d);

    // Fade old evidence after the decisions, so this story counts in full now and less later.
    for (const scope of touched) {
      const faded = temper(state[scope]);
      await tx.saveAbility(i.learnerId, scope, faded, summarise(faded));
    }

    return { applied: true, level, focus, summaries, measures, result, decisions };
  });
}
