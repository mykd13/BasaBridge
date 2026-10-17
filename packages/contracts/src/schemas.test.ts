import { describe, expect, it } from 'vitest';
import {
  AccountEvent,
  AnswerEvidence,
  AnswerRecord,
  AnswerSubmission,
  Decision,
  HomeActivity,
  LearnPlan,
  ReadingSession,
  Story,
  StoryQuestion,
  TryAnalysis,
  TryRecord,
  WordResult,
} from './index';

const id = '8f14e45f-ceea-467f-a0e6-1e2a3b4c5d6e';
const id2 = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

const question = {
  skill: 'literal',
  word: null,
  question: 'Who sat?',
  options: ['cat', 'dog', 'bird', 'fish'],
  answerIndex: 0,
  evidence: 'The cat sat.',
};

const analysis = {
  completed: true,
  lastWordIndex: 2,
  wordsTotal: 3,
  wordsRight: 3,
  seconds: 2,
  wordsPerMinute: 90,
  words: [{ expected: 'The', heard: 'The', outcome: 'correct', confidence: 0.9 }],
};

describe('story and question', () => {
  it('accepts a question with four options', () => {
    expect(StoryQuestion.safeParse(question).success).toBe(true);
  });

  it('rejects three options or an answer index past the options', () => {
    expect(StoryQuestion.safeParse({ ...question, options: ['a', 'b', 'c'] }).success).toBe(false);
    expect(StoryQuestion.safeParse({ ...question, answerIndex: 4 }).success).toBe(false);
  });

  it('needs at least four questions', () => {
    const story = {
      title: 'T',
      text: 'The cat sat.',
      level: 3,
      words: 3,
      readingGrade: 1.2,
      questions: [question, question, question, question],
    };
    expect(Story.safeParse(story).success).toBe(true);
    expect(Story.safeParse({ ...story, questions: [question] }).success).toBe(false);
    expect(Story.safeParse({ ...story, level: 0 }).success).toBe(false);
  });
});

describe('answer evidence', () => {
  it('records accommodations and rejects unknown ones', () => {
    const ok = { correct: true, responseMs: 1200, rushed: false, accommodations: ['word_tap'] };
    expect(AnswerEvidence.safeParse(ok).success).toBe(true);
    expect(AnswerEvidence.safeParse({ ...ok, accommodations: ['hint'] }).success).toBe(false);
    expect(AnswerEvidence.safeParse({ ...ok, responseMs: -1 }).success).toBe(false);
  });
});

describe('word result and try analysis', () => {
  it('defaults markedMisheard to false and keeps confidence between 0 and 1', () => {
    const word = { expected: 'cat', heard: 'cut', outcome: 'substitution', confidence: 0.5 };
    expect(WordResult.parse(word).markedMisheard).toBe(false);
    expect(WordResult.safeParse({ ...word, confidence: 1.5 }).success).toBe(false);
    expect(WordResult.safeParse({ ...word, outcome: 'mumble' }).success).toBe(false);
  });

  it('accepts a full analysis and rejects negative counts', () => {
    expect(TryAnalysis.safeParse(analysis).success).toBe(true);
    expect(TryAnalysis.safeParse({ ...analysis, wordsRight: -1 }).success).toBe(false);
    expect(TryAnalysis.safeParse({ ...analysis, lastWordIndex: -2 }).success).toBe(false);
  });
});

describe('decision and home activity', () => {
  it('defaults evidence to an empty object', () => {
    const d = Decision.parse({ kind: 'level', title: 't', summary: 's' });
    expect(d.evidence).toEqual({});
    expect(Decision.safeParse({ kind: 'mood', title: 't', summary: 's' }).success).toBe(false);
  });

  it('keeps minutes and steps in range', () => {
    const a = { title: 't', minutes: 5, steps: ['one', 'two'], tip: 'tip', source: 'standard' };
    expect(HomeActivity.safeParse(a).success).toBe(true);
    expect(HomeActivity.safeParse({ ...a, minutes: 2 }).success).toBe(false);
    expect(HomeActivity.safeParse({ ...a, steps: ['one'] }).success).toBe(false);
  });
});

describe('reading session and tries', () => {
  const session = {
    id,
    learnerId: id2,
    storyId: id,
    triesAllowed: null,
    triesUsed: 0,
    countedTryId: null,
    status: 'reading',
  };

  it('allows unlimited tries as null and rejects zero or negative', () => {
    expect(ReadingSession.safeParse(session).success).toBe(true);
    expect(ReadingSession.safeParse({ ...session, triesAllowed: 3 }).success).toBe(true);
    expect(ReadingSession.safeParse({ ...session, triesAllowed: 0 }).success).toBe(false);
    expect(ReadingSession.safeParse({ ...session, triesUsed: -1 }).success).toBe(false);
  });

  it('rejects a bad id or status', () => {
    expect(ReadingSession.safeParse({ ...session, id: 'abc' }).success).toBe(false);
    expect(ReadingSession.safeParse({ ...session, status: 'paused' }).success).toBe(false);
  });

  it('wraps an analysis in a try record', () => {
    const rec = { id, sessionId: id2, analysis, createdAt: '2026-10-17T10:00:00Z' };
    expect(TryRecord.safeParse(rec).success).toBe(true);
    expect(TryRecord.safeParse({ ...rec, analysis: {} }).success).toBe(false);
  });
});

describe('answers', () => {
  it('needs at least one chosen index in a submission', () => {
    const sub = { sessionId: id, questionId: id2, chosen: [1], responseMs: 900 };
    expect(AnswerSubmission.parse(sub).accommodations).toEqual([]);
    expect(AnswerSubmission.safeParse({ ...sub, chosen: [] }).success).toBe(false);
  });

  it('keeps weight between 0 and 1', () => {
    const rec = {
      sessionId: id,
      questionId: id2,
      chosen: [0],
      correct: true,
      responseMs: 900,
      rushed: false,
      accommodations: [],
      weight: 1,
    };
    expect(AnswerRecord.safeParse(rec).success).toBe(true);
    expect(AnswerRecord.safeParse({ ...rec, weight: 1.5 }).success).toBe(false);
  });
});

describe('learn plan', () => {
  it('accepts a plan with no lesson and rejects a made-up skill', () => {
    const plan = {
      focusSkill: 'inferential',
      lessonId: null,
      nextStoryLevel: 12,
      noteSource: 'ai',
    };
    expect(LearnPlan.safeParse(plan).success).toBe(true);
    expect(LearnPlan.safeParse({ ...plan, focusSkill: 'fluency' }).success).toBe(false);
    expect(LearnPlan.safeParse({ ...plan, nextStoryLevel: 101 }).success).toBe(false);
  });
});

describe('account events', () => {
  it('accepts each event type', () => {
    const events = [
      { type: 'signed_up', userId: id, role: 'student', ageBand: '2014-2016' },
      { type: 'mic_approval_requested', learnerId: id },
      { type: 'mic_approval_decided', learnerId: id, approved: true },
      { type: 'parent_linked', parentId: id, learnerId: id2 },
      { type: 'parent_link_revoked', parentId: id, learnerId: id2 },
      { type: 'consent_given', userId: id, kind: 'terms', version: 1 },
      { type: 'audio_retention_changed', learnerId: id, keepAudio: false },
      { type: 'account_deleted', userId: id },
    ];
    for (const e of events) expect(AccountEvent.safeParse(e).success, e.type).toBe(true);
  });

  it('rejects an unknown type and a missing field', () => {
    expect(AccountEvent.safeParse({ type: 'logged_in', userId: id }).success).toBe(false);
    expect(AccountEvent.safeParse({ type: 'parent_linked', parentId: id }).success).toBe(false);
  });

  it('drops a name or email if one is sent, so it never travels further', () => {
    const parsed = AccountEvent.parse({
      type: 'account_deleted',
      userId: id,
      email: 'someone@example.test',
    });
    expect(parsed).toEqual({ type: 'account_deleted', userId: id });
  });
});
