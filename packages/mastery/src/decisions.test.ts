import { Decision } from '@basabridge/contracts';
import { describe, expect, it } from 'vitest';
import { prior } from './ability';
import { scoreAnswer } from './answer-evidence';
import { analysisDecision, focusDecision, levelDecision } from './decisions';
import { decideLevel, startingState, summariseAll } from './engine';

const summaries = summariseAll(startingState(40, {}));
const measures = { wordsRightShare: 0.9, wordsPerMinute: 75 };
const result = { wordsRightShare: 0.9, questionsCorrect: 4, questionsTotal: 5 };
const scored = [
  scoreAnswer(
    {
      answerId: 'a1',
      questionId: 'q1',
      skill: 'literal',
      correct: true,
      responseMs: 0,
      wordsOnScreen: 10,
      accommodations: ['question_read_aloud'],
    },
    40,
  ),
];

const FORBIDDEN = ['name', 'username', 'email', 'audio'];
const keysOf = (x: unknown): string[] =>
  x && typeof x === 'object' ? Object.entries(x).flatMap(([k, v]) => [k, ...keysOf(v)]) : [];

describe('decision rows', () => {
  it('analysis lists every answer with its weight, rushed flag and read-aloud use', () => {
    const d = analysisDecision('session-1', scored, summaries, measures);
    expect(Decision.parse(d).kind).toBe('analysis');
    const answers = d.evidence.answers as { rushed: boolean; questionReadAloud: boolean }[];
    expect(answers[0]).toMatchObject({ rushed: true, questionReadAloud: true });
    expect(d.summary).toContain('1 counted for less');
  });

  it('analysis records every accommodation, word tap included', () => {
    const tapped = scoreAnswer(
      {
        answerId: 'a2',
        questionId: 'q2',
        skill: 'vocabulary',
        correct: false,
        responseMs: 60_000,
        wordsOnScreen: 10,
        accommodations: ['word_tap', 'question_read_aloud'],
      },
      40,
    );
    const d = analysisDecision('session-1', [tapped], summaries, measures);
    const answers = d.evidence.answers as { accommodations: string[] }[];
    expect(answers[0]?.accommodations).toEqual(['word_tap', 'question_read_aloud']);
  });

  it('analysis records the session it came from, so a retry can see it was applied', () => {
    expect(analysisDecision('session-9', scored, summaries, measures).evidence.sessionId).toBe(
      'session-9',
    );
  });

  it('carries a message key so the interface can render from the catalog', () => {
    expect(analysisDecision('session-1', scored, summaries, measures).evidence.messageKey).toBe(
      'decision.analysis',
    );
    expect(focusDecision(null, 'literal', {}, 'ability').evidence).toMatchObject({
      messageKey: 'decision.focus',
      params: { skill: 'literal', from: null },
    });
  });

  it('level change records the evidence used', () => {
    const outcome = decideLevel({
      level: 40,
      storyLevel: 40,
      passes: 0,
      result,
      comprehension: prior(0),
      levelItems: 0,
      recentWordsRight: [0.9, 0.9],
      model: 'simple',
    });
    const d = levelDecision({
      fromLevel: 40,
      outcome: { ...outcome, level: 41, moved: 'up' },
      comprehension: summaries.comprehension,
      levelItems: 12.4,
      measures,
      result,
      recentWordsRight: [0.9, 0.9],
    });
    expect(Decision.parse(d)).toMatchObject({ kind: 'level', title: 'Moved up to Level 41' });
    expect(d.evidence).toMatchObject({
      fromLevel: 40,
      toLevel: 41,
      model: 'simple',
      levelItems: 12.4,
    });
  });

  it('focus change records the old and new focus with the estimates', () => {
    const d = focusDecision(null, 'inferential', { inferential: { mean: -1 } }, 'ability');
    expect(Decision.parse(d)).toMatchObject({ kind: 'plan' });
    expect(d.evidence).toMatchObject({ from: null, to: 'inferential', model: 'ability' });
  });

  it('never carries names, usernames, emails or audio', () => {
    const all = [
      analysisDecision('session-1', scored, summaries, measures),
      focusDecision('literal', 'vocabulary', {}, 'simple'),
    ];
    for (const d of all) {
      expect(keysOf(d).filter((k) => FORBIDDEN.includes(k.toLowerCase()))).toEqual([]);
    }
  });
});
