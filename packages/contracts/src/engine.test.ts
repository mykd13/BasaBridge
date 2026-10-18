import { describe, expect, it } from 'vitest';
import {
  PlacementAnswerRequest,
  PlacementReadRequest,
  PlacementView,
  PublicQuestion,
  SubmitAnswerRequest,
  SubmitTryRequest,
} from './engine';

const id = '00000000-0000-4000-8000-000000000001';

describe('engine request shapes', () => {
  it('accepts a capture id or a silent read and nothing that looks like a score', () => {
    expect(SubmitTryRequest.parse({ mode: 'voice', captureId: 'capture-12345' }).listened).toBe(
      false,
    );
    expect(SubmitTryRequest.parse({ mode: 'silent' }).mode).toBe('silent');
    expect(SubmitTryRequest.safeParse({ mode: 'voice' }).success).toBe(false);
    const withScore = SubmitTryRequest.parse({
      mode: 'voice',
      captureId: 'capture-12345',
      wordsRight: 20,
    });
    expect('wordsRight' in withScore).toBe(false);
  });

  it('defaults accommodations and bounds the pick', () => {
    const ok = SubmitAnswerRequest.parse({ questionId: id, chosen: [1], responseMs: 4000 });
    expect(ok.accommodations).toEqual([]);
    expect(
      SubmitAnswerRequest.safeParse({ questionId: id, chosen: [], responseMs: 1 }).success,
    ).toBe(false);
    expect(
      SubmitAnswerRequest.safeParse({ questionId: id, chosen: [-1], responseMs: 1 }).success,
    ).toBe(false);
  });

  it('gives placement answers no accommodations', () => {
    const parsed = PlacementAnswerRequest.parse({
      questionId: id,
      chosen: [0],
      responseMs: 3000,
      accommodations: ['question_read_aloud'],
    });
    expect('accommodations' in parsed).toBe(false);
  });

  it('knows the three placement read modes', () => {
    expect(PlacementReadRequest.safeParse({ mode: 'voice_failed' }).success).toBe(true);
    expect(PlacementReadRequest.safeParse({ mode: 'skip' }).success).toBe(false);
  });
});

describe('engine response shapes', () => {
  it('has no field for an answer key on a question', () => {
    const q = PublicQuestion.parse({
      id,
      type: 'multiple_choice',
      skill: 'literal',
      question: 'Who?',
      options: ['a', 'b', 'c', 'd'],
      answerIndex: 1,
      evidence: 'secret',
    });
    expect(JSON.stringify(q)).not.toContain('secret');
    expect('answerIndex' in q).toBe(false);
  });

  it('locks every placement support to false', () => {
    const base = {
      id,
      status: 'reading',
      voiceMode: 'voice',
      storyNumber: 1,
      maxStories: 4,
      story: null,
      questions: [],
      answeredQuestionIds: [],
      retryRead: false,
      result: null,
      voiceRecheckDue: false,
    };
    const supports = {
      listenThenRead: false,
      wordTap: false,
      questionReadAloud: false,
      learn: false,
    };
    expect(PlacementView.safeParse({ ...base, supports }).success).toBe(true);
    expect(
      PlacementView.safeParse({ ...base, supports: { ...supports, wordTap: true } }).success,
    ).toBe(false);
  });
});
