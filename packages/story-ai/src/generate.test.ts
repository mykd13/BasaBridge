import { Story } from '@basabridge/contracts';
import { APICallError } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { generateStory, type GenerateStoryInput } from './generate';

const ENV = { STORY_MODEL: 'google/test-model', AI_GATEWAY_API_KEY: 'test-key' };

const PASSAGE =
  'Lia and her grandfather have a mango tree. Every morning, Lia checks the tree. The mangoes are still green. One day, the wind blows hard. Three mangoes fall. Lia picks them up, but they are too sour. Grandfather smiles. "We must be patient," he says.';

const question = (over: Record<string, unknown> = {}) => ({
  skill: 'literal',
  word: null,
  question: 'Where does Lia check every morning?',
  options: ['The tree', 'The river', 'The school', 'The market'],
  answerIndex: 0,
  evidence: 'Every morning, Lia checks the tree.',
  ...over,
});

const goodStory = (over: Record<string, unknown> = {}) => ({
  title: 'The Mango Tree',
  text: PASSAGE,
  questions: [
    question(),
    question({
      question: 'How many mangoes fall?',
      options: ['Three', 'One', 'Five', 'Ten'],
      evidence: 'Three mangoes fall.',
    }),
    question({
      question: 'What color are the mangoes?',
      options: ['Green', 'Red', 'Yellow', 'Brown'],
      evidence: 'The mangoes are still green.',
    }),
    question({
      skill: 'inferential',
      question: 'Why does Grandfather say they must be patient?',
      options: [
        'The mangoes are not ready yet',
        'The tree is too tall',
        'Lia is too small',
        'It is going to rain',
      ],
      evidence: 'Lia picks them up, but they are too sour.',
    }),
    question({
      skill: 'vocabulary',
      word: 'patient',
      question: 'What does "patient" mean in the story?',
      options: ['Able to wait calmly', 'Very hungry', 'Feeling sick', 'In a hurry'],
      evidence: '"We must be patient," he says.',
    }),
  ],
  ...over,
});

type Reply = { json: unknown; cost?: string | number; input?: number; output?: number };

/** A mock model that answers each call with the next reply, as the gateway would. */
function mockModel(replies: Reply[]) {
  let call = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => {
      const r = replies[Math.min(call++, replies.length - 1)]!;
      return {
        content: [
          { type: 'text', text: typeof r.json === 'string' ? r.json : JSON.stringify(r.json) },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: r.input, noCache: r.input, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: r.output, text: r.output, reasoning: 0 },
        },
        ...(r.cost !== undefined ? { providerMetadata: { gateway: { cost: r.cost } } } : {}),
        warnings: [],
      };
    },
  });
}

const input = {
  level: 24,
  focus: null,
  recentTitles: [] as string[],
  topic: 'a mango tree at home',
};

describe('generateStory', () => {
  it('returns a story that passes the shared Story schema, with usage', async () => {
    const model = mockModel([{ json: goodStory(), input: 900, output: 400, cost: '0.0021' }]);
    const out = await generateStory(input, { env: ENV, model });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(Story.safeParse(out.story).success).toBe(true);
    expect(out.story.level).toBe(24);
    expect(out.story.title).toBe('The Mango Tree');
    expect(out.usage).toEqual({
      attempts: 1,
      inputTokens: 900,
      outputTokens: 400,
      costUsd: 0.0021,
    });
  });

  it('asks for the skill mix chosen by code, with extras on the focus skill', async () => {
    const model = mockModel([{ json: goodStory() }]);
    await generateStory({ ...input, focus: 'inferential' }, { env: ENV, model });
    const sent = JSON.stringify(model.doGenerateCalls[0]!.prompt);
    expect(sent).toContain('Questions: write exactly 5');
    expect(sent.match(/an inferential question/g)).toHaveLength(3);
    expect(sent).toContain('Topic: a mango tree at home.');
  });

  it('leaves cost out when the gateway does not report it', async () => {
    const model = mockModel([{ json: goodStory(), input: 10, output: 5 }]);
    const out = await generateStory(input, { env: ENV, model });
    expect(out.usage).toEqual({ attempts: 1, inputTokens: 10, outputTokens: 5 });
  });

  it('fails with a config error and no call when STORY_MODEL is missing', async () => {
    const model = mockModel([{ json: goodStory() }]);
    const out = await generateStory(input, { env: { AI_GATEWAY_API_KEY: 'k' }, model });
    expect(out).toEqual({
      ok: false,
      error: { kind: 'config', reason: expect.stringContaining('STORY_MODEL') },
      usage: { attempts: 0 },
    });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('rejects a level outside 1 to 100 before any call', async () => {
    const model = mockModel([{ json: goodStory() }]);
    const out = await generateStory({ ...input, level: 0 }, { env: ENV, model });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.kind).toBe('config');
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('stops at once with model_call when the call throws, and never leaks the message', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error('secret prompt text and key abc123');
      },
    });
    const out = await generateStory(input, { env: ENV, model });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error.kind).toBe('model_call');
    expect(out.error.reason).not.toContain('abc123');
    expect(out.usage.attempts).toBe(1);
    expect('story' in out).toBe(false);
  });

  it('retries invalid output with the reason, then succeeds, summing usage', async () => {
    const model = mockModel([
      { json: 'not json', input: 100, output: 20, cost: 0.001 },
      { json: goodStory(), input: 120, output: 300, cost: 0.002 },
    ]);
    const out = await generateStory(input, { env: ENV, model });
    expect(out.ok).toBe(true);
    expect(out.usage.attempts).toBe(2);
    expect(out.usage.inputTokens).toBe(220);
    expect(out.usage.outputTokens).toBe(320);
    expect(out.usage.costUsd).toBeCloseTo(0.003);
    const retry = JSON.stringify(model.doGenerateCalls[1]!.prompt);
    expect(retry).toContain('The last try failed these checks.');
    expect(retry).toContain('- The reply did not match the story shape.');
  });

  it('retries a failed check with its reason', async () => {
    const tooShort = goodStory({ text: 'Lia has a tree.' });
    const model = mockModel([{ json: tooShort }, { json: goodStory() }]);
    const out = await generateStory(input, { env: ENV, model });
    expect(out.ok).toBe(true);
    expect(JSON.stringify(model.doGenerateCalls[1]!.prompt)).toContain('The passage had 4 words');
  });

  it('fails with invalid_output when every attempt is malformed', async () => {
    const model = mockModel([{ json: 'not json' }]);
    const out = await generateStory(input, { env: ENV, model });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toEqual({
      kind: 'invalid_output',
      reason: 'The reply did not match the story shape.',
    });
    expect(out.usage.attempts).toBe(3);
  });

  it('turns SDK retries off, so every provider call is a counted attempt', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: 'busy',
          url: 'https://gateway.example',
          requestBodyValues: {},
          statusCode: 503,
          isRetryable: true,
        });
      },
    });
    const out = await generateStory(input, { env: ENV, model });
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(out.usage.attempts).toBe(1);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.kind).toBe('model_call');
  });

  it('fails with checks_failed after the last attempt, never a partial story', async () => {
    const model = mockModel([{ json: goodStory({ questions: [question()] }) }]);
    const out = await generateStory(input, { env: ENV, model });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error.kind).toBe('checks_failed');
    expect(out.usage.attempts).toBe(3);
    expect(model.doGenerateCalls).toHaveLength(3);
    expect('story' in out).toBe(false);
  });

  it('treats a recent title as a failed check', async () => {
    const model = mockModel([{ json: goodStory() }]);
    const out = await generateStory(
      { ...input, recentTitles: ['the mango tree!'] },
      { env: ENV, model, maxAttempts: 1 },
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error.reason).toContain('recent story');
  });

  it('picks a topic when the caller gives none, avoiding recent ones', async () => {
    const model = mockModel([{ json: goodStory() }]);
    await generateStory(
      { level: 24, focus: null, recentTitles: [], recentTopics: ['a lost slipper'] },
      { env: ENV, model, random: () => 0 },
    );
    const sent = JSON.stringify(model.doGenerateCalls[0]!.prompt);
    expect(sent).toMatch(/Topic: [a-z]/);
    expect(sent).not.toContain('Topic: a lost slipper.');
  });

  // Golden rule 2 and docs/security/provider-terms.md: levels, a topic and story rules only.
  it('sends no names, usernames, emails, learner IDs or keys to the model', async () => {
    const model = mockModel([{ json: goodStory() }]);
    const learner = {
      ...input,
      name: 'Maria Santos',
      username: 'maria123',
      email: 'maria@example.com',
      guardianEmail: 'parent@example.com',
      learnerId: 'lrn_7f3a9c',
    } as typeof input;
    await generateStory(learner, { env: ENV, model });
    const sent = JSON.stringify(model.doGenerateCalls[0]);
    const planted = ['Maria', 'maria123', 'maria@example.com', 'parent@example.com', 'lrn_7f3a9c'];
    for (const value of [...planted, 'test-key']) {
      expect(sent).not.toContain(value);
    }
  });

  it('accepts only a topic from TOPIC_SEEDS, before any call', async () => {
    const model = mockModel([{ json: goodStory() }]);
    const out = await generateStory(
      { ...input, topic: 'a story about Maria Santos' },
      { env: ENV, model },
    );
    expect(out).toEqual({
      ok: false,
      error: { kind: 'config', reason: 'The topic must be one of TOPIC_SEEDS.' },
      usage: { attempts: 0 },
    });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  // Golden rule 2: plant learner data in the two caller text fields, topic and recent titles.
  it('never sends learner data planted in the topic or recent titles', async () => {
    const planted = ['Maria Santos', 'maria123', 'maria@example.com', 'lrn_7f3a9c'];
    for (const value of planted) {
      const model = mockModel([{ json: goodStory() }]);
      await generateStory({ ...input, topic: value }, { env: ENV, model });
      await generateStory({ ...input, recentTitles: [value] }, { env: ENV, model });
      for (const call of model.doGenerateCalls) {
        expect(JSON.stringify(call)).not.toContain(value);
      }
    }
  });

  it('checks a repeated title in code and asks for a new one without naming it', async () => {
    const model = mockModel([{ json: goodStory({ title: 'Rain Day' }) }, { json: goodStory() }]);
    const out = await generateStory({ ...input, recentTitles: ['Rain Day'] }, { env: ENV, model });
    expect(out.ok).toBe(true);
    const retry = JSON.stringify(model.doGenerateCalls[1]!.prompt);
    expect(retry).toContain('The title repeats a recent story. Use a new title.');
    expect(retry).not.toContain('Rain Day');
  });

  it('takes only the allowed input fields, so a new field fails this test', () => {
    expectTypeOf<keyof GenerateStoryInput>().toEqualTypeOf<
      'level' | 'focus' | 'recentTitles' | 'topic' | 'recentTopics'
    >();
  });
});
