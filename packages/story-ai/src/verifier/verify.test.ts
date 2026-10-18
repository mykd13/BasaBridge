import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StoryQuestion } from '@basabridge/contracts';
import type { VerificationRecord } from './metrics';
import { verifyStory, type CallVerifierModel } from './verify';

const EVIDENCE = 'Distinctive evidence sentence that must stay private.';

const q = (n: number, answerIndex: number): StoryQuestion => ({
  skill: 'literal',
  word: null,
  question: `Question text ${n}?`,
  options: ['a', 'b', 'c', 'd'],
  answerIndex,
  evidence: EVIDENCE,
});

const story = {
  title: 'The red kite',
  text: 'Mila had a red kite. The wind took it over the hill.',
  level: 4,
  questions: [q(1, 0), q(2, 1), q(3, 2), q(4, 3), q(5, 0)],
};

const safe = { safe: true, categories: [], reason: 'ok' };
const answers = (idx: number[]) => idx.map((answerIndex, i) => ({ question: i + 1, answerIndex }));

function setup(reply: CallVerifierModel) {
  const callModel = vi.fn<CallVerifierModel>(reply);
  const records: VerificationRecord[] = [];
  const onRecord = (r: VerificationRecord) => void records.push(r);
  return { callModel, records, deps: { callModel, onRecord } };
}

function expectPrivatePrompt(callModel: ReturnType<typeof vi.fn<CallVerifierModel>>) {
  expect(callModel).toHaveBeenCalledTimes(1);
  const { system, prompt } = callModel.mock.calls[0]![0];
  expect(`${system}\n${prompt}`).not.toContain(EVIDENCE);
  expect(prompt).toContain(story.text);
  expect(prompt).toContain('Question 5: Question text 5?');
}

describe('verifyStory', () => {
  it('keeps every question when the checker agrees', async () => {
    const { callModel, records, deps } = setup(async () => ({
      answers: answers([0, 1, 2, 3, 0]),
      safety: safe,
    }));
    const out = await verifyStory(story, deps);
    expect(out.ok && out.questions).toHaveLength(5);
    expect(records).toEqual([
      { level: 4, questionsIn: 5, agreed: 5, disagreed: 0, outcome: 'kept', categories: [] },
    ]);
    expectPrivatePrompt(callModel);
  });

  it('still keeps the story with one disagreement', async () => {
    const { callModel, records, deps } = setup(async () =>
      JSON.stringify({ answers: answers([0, 3, 2, 3, 0]), safety: safe }),
    );
    const out = await verifyStory(story, deps);
    expect(out.ok && out.questions).toHaveLength(4);
    expect(out.ok && out.disagreed).toEqual([2]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ agreed: 4, disagreed: 1, outcome: 'kept' });
    expectPrivatePrompt(callModel);
  });

  it('rejects an unsafe passage', async () => {
    const { callModel, records, deps } = setup(async () => ({
      answers: answers([0, 1, 2, 3, 0]),
      safety: { safe: false, categories: ['violence'], reason: 'fight' },
    }));
    const out = await verifyStory(story, deps);
    expect(out).toMatchObject({ ok: false, kind: 'rejected', categories: ['violence'] });
    expect(records).toEqual([
      {
        level: 4,
        questionsIn: 5,
        agreed: 5,
        disagreed: 0,
        outcome: 'rejected_unsafe',
        categories: ['violence'],
      },
    ]);
    expectPrivatePrompt(callModel);
  });

  it('rejects when too few questions agree and gives a retry reason', async () => {
    const { callModel, records, deps } = setup(async () => ({
      answers: answers([0, 3, 0, 3, 0]),
      safety: safe,
    }));
    const out = await verifyStory(story, deps);
    expect(out).toMatchObject({ ok: false, kind: 'rejected', disagreed: [2, 3] });
    expect(!out.ok && out.reason).toContain('questions 2 and 3');
    expect(records[0]).toMatchObject({ outcome: 'rejected_too_few', agreed: 3, disagreed: 2 });
    expectPrivatePrompt(callModel);
  });

  it('reports a malformed reply as invalid output', async () => {
    const { callModel, records, deps } = setup(async () => 'not json at all');
    const out = await verifyStory(story, deps);
    expect(out).toMatchObject({ ok: false, kind: 'invalid_output' });
    expect(records).toEqual([
      {
        level: 4,
        questionsIn: 5,
        agreed: 0,
        disagreed: 0,
        outcome: 'invalid_reply',
        categories: [],
      },
    ]);
    expectPrivatePrompt(callModel);
  });

  it('reports a throwing call without leaking its message', async () => {
    const { callModel, records, deps } = setup(async () => {
      throw new Error(`gateway echoed: ${story.text}`);
    });
    const out = await verifyStory(story, deps);
    expect(out).toMatchObject({ ok: false, kind: 'model_call' });
    expect(!out.ok && out.reason).not.toContain('Mila');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ outcome: 'model_call_failed' });
    expectPrivatePrompt(callModel);
  });

  it('works without an onRecord callback', async () => {
    const out = await verifyStory(story, {
      callModel: async () => ({ answers: answers([0, 1, 2, 3, 0]), safety: safe }),
    });
    expect(out.ok).toBe(true);
  });
});

describe('verifyStory hardening', () => {
  afterEach(() => vi.useRealTimers());

  it('sends the title to the checker', async () => {
    const { callModel, deps } = setup(async () => ({
      answers: answers([0, 1, 2, 3, 0]),
      safety: safe,
    }));
    await verifyStory(story, deps);
    expect(callModel.mock.calls[0]![0].prompt).toContain('<title>The red kite</title>');
  });

  it('rejects when only the title is unsafe', async () => {
    const { callModel, records, deps } = setup(async (input) => {
      const titleUnsafe = input.prompt.includes('<title>Coca-Cola Superhero</title>');
      return {
        answers: answers([0, 1, 2, 3, 0]),
        safety: titleUnsafe ? { safe: false, categories: ['brands'], reason: 'brand' } : safe,
      };
    });
    const out = await verifyStory({ ...story, title: 'Coca-Cola Superhero' }, deps);
    expect(out.ok).toBe(false);
    expect(!out.ok && out.kind).toBe('rejected');
    expect(!out.ok && out.categories).toEqual(['brands']);
    expect(records[0]!.outcome).toBe('rejected_unsafe');
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it('still returns the verdict when onRecord throws', async () => {
    const callModel = vi.fn<CallVerifierModel>(async () => ({
      answers: answers([0, 1, 2, 3, 0]),
      safety: safe,
    }));
    const kept = await verifyStory(story, {
      callModel,
      onRecord: () => {
        throw new Error('log write failed');
      },
    });
    expect(kept.ok).toBe(true);

    const rejected = await verifyStory(story, {
      callModel: async () => ({
        answers: answers([0, 1, 2, 3, 0]),
        safety: { safe: false, categories: ['violence'], reason: 'x' },
      }),
      onRecord: () => {
        throw new Error('log write failed');
      },
    });
    expect(!rejected.ok && rejected.kind).toBe('rejected');

    const failed = await verifyStory(story, {
      callModel: async () => {
        throw new Error('boom');
      },
      onRecord: () => {
        throw new Error('log write failed');
      },
    });
    expect(!failed.ok && failed.kind).toBe('model_call');
  });

  it('treats a stalled call as a model_call failure and aborts it', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const records: VerificationRecord[] = [];
    const pending = verifyStory(story, {
      timeoutMs: 1000,
      onRecord: (r) => void records.push(r),
      callModel: ({ signal: s }) => {
        signal = s;
        return new Promise(() => {});
      },
    });
    await vi.advanceTimersByTimeAsync(1000);
    const out = await pending;
    expect(!out.ok && out.kind).toBe('model_call');
    expect(signal?.aborted).toBe(true);
    expect(records).toEqual([
      {
        level: 4,
        questionsIn: 5,
        agreed: 0,
        disagreed: 0,
        outcome: 'model_call_failed',
        categories: [],
      },
    ]);
  });

  it('does not time out a call that answers in time', async () => {
    vi.useFakeTimers();
    const out = verifyStory(story, {
      timeoutMs: 1000,
      callModel: async () => ({ answers: answers([0, 1, 2, 3, 0]), safety: safe }),
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect((await out).ok).toBe(true);
  });
});
