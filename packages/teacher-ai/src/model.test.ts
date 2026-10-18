import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { writeNotes } from './index';
import { gatewayNotesModel, notesModelFromEnv } from './model';

const reply = {
  childMessage: 'You read every word out loud. Keep looking for clues in the story.',
  whatHappened: 'Answered 4 of 5 questions correctly.',
  whyFocus: 'The next stories practise reading between the lines.',
  homeActivity: {
    title: 'Clue hunt',
    minutes: 5,
    steps: ['Read two sentences together.', 'Ask what the story hints at.'],
    tip: 'Point to the words that gave the clue.',
  },
};

const mockModel = (text: string) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 10, text: 10, reasoning: 0 },
      },
      warnings: [],
    }),
  });

const input = {
  levelBefore: 30,
  levelAfter: 30,
  passed: true,
  correct: 4,
  total: 5,
  focus: 'inferential' as const,
};

describe('gatewayNotesModel', () => {
  it('returns structured notes from generateText', async () => {
    const model = gatewayNotesModel(mockModel(JSON.stringify(reply)));
    const notes = await writeNotes(input, { model });
    expect(notes).toMatchObject({ source: 'ai', childMessage: reply.childMessage });
  });

  it('falls back when the model replies with text that is not the notes JSON', async () => {
    const model = gatewayNotesModel(mockModel('Sorry, I cannot help with that.'));
    const notes = await writeNotes(input, { model });
    expect(notes).toMatchObject({ source: 'standard', fallbackReason: 'call_failed' });
  });
});

describe('notesModelFromEnv', () => {
  it('is null unless NOTES_MODEL is set', () => {
    expect(notesModelFromEnv({})).toBeNull();
    expect(notesModelFromEnv({ NOTES_MODEL: '  ' })).toBeNull();
    expect(notesModelFromEnv({ NOTES_MODEL: 'provider/small-model' })).toBeTypeOf('function');
  });
});

describe('timeout', () => {
  it('falls back with the timeout reason when the model never replies', async () => {
    const hanging = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) =>
        new Promise((_resolve, reject) => {
          abortSignal?.addEventListener('abort', () => reject(abortSignal.reason));
        }),
    });
    const notes = await writeNotes(input, { model: gatewayNotesModel(hanging, 50) });
    expect(notes).toMatchObject({ source: 'standard', fallbackReason: 'timeout' });
  });
});
