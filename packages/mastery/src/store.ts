/**
 * The only I/O in mastery, through an interface. A Drizzle adapter lives with the database
 * client and reads learner data through the authorization layer (BB-10). Each entry point runs
 * in one transaction, so a level, its passes and its decision rows are saved together.
 * Owner: Jhade (BB-19).
 */
import type { ComprehensionSkill, Decision, TryAnalysis } from '@basabridge/contracts';
import { EVIDENCE_RULE, type StoryResult } from '@basabridge/levels';
import type { AbilitySummary, Posterior } from './ability';
import {
  scoreAnswer,
  toItemEvidence,
  type AnswerInput,
  type ScoredAnswer,
} from './answer-evidence';
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
   * the transaction ends, so two answers or a story finish at once cannot lose an update to
   * ability_estimates.
   */
  getLearner(learnerId: string): Promise<{ level: number; passes: number }>;
  /** ability_estimates rows by scope. */
  getAbility(learnerId: string): Promise<Partial<AbilityState>>;
  saveAbility(
    learnerId: string,
    scope: AbilityScope,
    posterior: Posterior,
    summary: AbilitySummary,
  ): Promise<void>;
  /** answers.rushed and answers.weight. The adapter scopes the update to this learner's own sessions. */
  saveAnswerWeight(
    learnerId: string,
    answerId: string,
    w: { rushed: boolean; weight: number },
  ): Promise<void>;
  /** Words-right shares of earlier counted tries, newest last, excluding this session. */
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

export interface ApplyAnswerInput {
  learnerId: string;
  storyLevel: number;
  answer: AnswerInput;
}

/**
 * Call once per stored answer of a real story. Never call it for Learn practice: practice never
 * changes a level (golden rule 10). Not idempotent: a second call counts the answer twice.
 */
export function applyAnswer(
  store: MasteryStore,
  i: ApplyAnswerInput,
): Promise<{ scored: ScoredAnswer; summaries: AbilitySummaries }> {
  return store.transaction(async (tx) => {
    const learner = await tx.getLearner(i.learnerId);
    const state = startingState(learner.level, await tx.getAbility(i.learnerId));
    const scored = scoreAnswer(i.answer, i.storyLevel);
    const next = updateAbility(state, scored.skill, toItemEvidence(scored));
    const summaries = summariseAll(next);
    const scopes: AbilityScope[] = ['comprehension', scored.skill];
    for (const scope of scopes) {
      await tx.saveAbility(i.learnerId, scope, next[scope], summaries[scope]);
    }
    await tx.saveAnswerWeight(i.learnerId, scored.answerId, {
      rushed: scored.rushed,
      weight: scored.weight,
    });
    return { scored, summaries };
  });
}

export interface ApplyStoryInput {
  learnerId: string;
  sessionId: string;
  storyLevel: number;
  countedTry: TryAnalysis;
  /** Every answer of this session, already passed to `applyAnswer`. */
  answers: readonly AnswerInput[];
  model?: MasteryModel;
}

export interface StoryOutcome {
  level: LevelOutcome;
  focus: ComprehensionSkill | null;
  summaries: AbilitySummaries;
  measures: ReadingMeasures;
  result: StoryResult;
  decisions: Decision[];
}

/** levelReadiness reads the last `recentTries` counted tries; this story's is one of them. */
const EARLIER_TRIES = EVIDENCE_RULE.up.recentTries - 1;

/** Call once per finished session, after `applyAnswer` for each of its answers. */
export function applyStoryResult(store: MasteryStore, i: ApplyStoryInput): Promise<StoryOutcome> {
  const model = i.model ?? 'ability';
  return store.transaction(async (tx) => {
    const learner = await tx.getLearner(i.learnerId);
    const state = startingState(learner.level, await tx.getAbility(i.learnerId));
    const summaries = summariseAll(state);
    const scored = i.answers.map((a) => scoreAnswer(a, i.storyLevel));
    const measures = readingMeasures(i.countedTry);
    const result = storyResult(i.countedTry, scored);
    const earlier = await tx.getRecentWordsRight(i.learnerId, {
      excludeSessionId: i.sessionId,
      limit: EARLIER_TRIES,
    });
    const recentWordsRight = [...earlier, measures.wordsRightShare];

    const level = decideLevel({
      level: learner.level,
      storyLevel: i.storyLevel,
      passes: learner.passes,
      result,
      comprehension: state.comprehension,
      recentWordsRight,
      model,
    });
    await tx.setLearnerLevel(i.learnerId, { level: level.level, passes: level.passes });

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
      focus = focusFromAbility(summaries);
      estimates = compactEstimates(summaries);
    }

    const decisions: Decision[] = [analysisDecision(scored, summaries, measures)];
    if (level.moved !== 'none') {
      decisions.push(
        levelDecision({
          fromLevel: learner.level,
          outcome: level,
          comprehension: summaries.comprehension,
          measures,
          result,
          recentWordsRight,
        }),
      );
    }
    const lastFocus = await tx.getLastFocus(i.learnerId);
    if (focus !== null && focus !== lastFocus) {
      decisions.push(focusDecision(lastFocus, focus, estimates, model));
    }
    for (const d of decisions) await tx.addDecision(i.learnerId, d);

    return { level, focus, summaries, measures, result, decisions };
  });
}
