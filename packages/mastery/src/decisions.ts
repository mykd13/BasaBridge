/**
 * Decision rows for the decision log (docs/PLAN.md 6.1). Every story writes an analysis row;
 * level and focus changes add their own. Evidence carries levels, counts and estimates only:
 * no names, usernames or audio (golden rule 2). Owner: Jhade (BB-19).
 */
import type { ComprehensionSkill, Decision } from '@basabridge/contracts';
import type { StoryResult } from '@basabridge/levels';
import type { AbilitySummary } from './ability';
import type { ScoredAnswer } from './answer-evidence';
import {
  ABILITY_SCOPES,
  type AbilitySummaries,
  type LevelOutcome,
  type MasteryModel,
  type ReadingMeasures,
} from './engine';

export function compactEstimates(s: AbilitySummaries): Record<string, unknown> {
  return Object.fromEntries(
    ABILITY_SCOPES.map((k) => [
      k,
      { mean: s[k].mean, sd: s[k].sd, items: s[k].items, confidence: s[k].confidence },
    ]),
  );
}

export function analysisDecision(
  answers: readonly ScoredAnswer[],
  summaries: AbilitySummaries,
  measures: ReadingMeasures,
): Decision {
  const reduced = answers.filter((a) => a.weight < 1).length;
  return {
    kind: 'analysis',
    title: 'Story answers counted',
    summary: `${answers.length} answers counted, ${reduced} counted for less.`,
    evidence: {
      answers: answers.map((a) => ({
        questionId: a.questionId,
        skill: a.skill,
        correct: a.correct,
        weight: a.weight,
        rushed: a.rushed,
        supportedTry: a.supportedTry,
        questionReadAloud: a.questionReadAloud,
        difficulty: a.difficulty,
        guess: a.guess,
      })),
      estimates: compactEstimates(summaries),
      wordsRightShare: measures.wordsRightShare,
      wordsPerMinute: measures.wordsPerMinute,
    },
  };
}

export interface LevelEvidence {
  fromLevel: number;
  outcome: LevelOutcome;
  comprehension: AbilitySummary;
  measures: ReadingMeasures;
  result: StoryResult;
  recentWordsRight: readonly number[];
}

/** Only call when the level changed. */
export function levelDecision(e: LevelEvidence): Decision {
  const up = e.outcome.moved === 'up';
  const why =
    e.outcome.model === 'ability'
      ? up
        ? 'Answers show strong evidence of reading above this level, with solid words right.'
        : 'Answers show strong evidence that this level is too hard for now.'
      : up
        ? 'Enough stories passed at this level.'
        : 'The last story was very hard.';
  return {
    kind: 'level',
    title: `Moved ${up ? 'up' : 'down'} to Level ${e.outcome.level}`,
    summary: why,
    evidence: {
      model: e.outcome.model,
      fromLevel: e.fromLevel,
      toLevel: e.outcome.level,
      passed: e.outcome.passed,
      probAbove: e.outcome.readiness?.probAbove ?? null,
      probBelow: e.outcome.readiness?.probBelow ?? null,
      abilityMean: e.comprehension.mean,
      abilitySd: e.comprehension.sd,
      items: e.comprehension.items,
      wordsRightShare: e.measures.wordsRightShare,
      wordsPerMinute: e.measures.wordsPerMinute,
      questionsCorrect: e.result.questionsCorrect,
      questionsTotal: e.result.questionsTotal,
      recentWordsRight: [...e.recentWordsRight],
    },
  };
}

export function focusDecision(
  from: ComprehensionSkill | null,
  to: ComprehensionSkill,
  estimates: Record<string, unknown>,
  model: MasteryModel,
): Decision {
  return {
    kind: 'plan',
    title: `Focus skill is now ${to}`,
    summary: from
      ? `Changed from ${from} because ${to} has the lowest estimate.`
      : `${to} has the lowest estimate.`,
    evidence: { from, to, model, estimates },
  };
}
