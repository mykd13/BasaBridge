import { describe, expect, it, vi } from 'vitest';
import type { CallVerifierModel } from '../verifier/verify';
import { generatePracticeItems, type CallPracticeModel } from './generate';
import type { PracticeRequest } from './prompt';

// Labelled sample items for tests only.
const passage = (n: number) =>
  `Ana had ${n} small dogs. The dogs ran to the gate. Ana saw the dogs were wet. They had played in the rain all day.`;

const rawItem = (n: number) => ({
  passage: passage(n),
  question: {
    skill: 'inferential',
    subskill: 'cause_effect',
    word: null,
    question: `Why were the ${n} dogs wet?`,
    options: [
      'They played in the rain.',
      'They took a bath.',
      'They swam in a lake.',
      'It was hot.',
    ],
    answerIndex: 0,
    distractors: [null, 'not_stated', 'not_stated', 'opposite'],
    evidence: 'They had played in the rain all day.',
  },
  hint: 'Look at what the dogs did all day.',
  explanation: 'The last sentence says the dogs played in the rain.',
});

const request: PracticeRequest = {
  level: 12,
  subskill: 'cause_effect',
  kind: 'practice',
  count: 2,
};

const agree: CallVerifierModel = async () => ({
  answers: [{ question: 1, answerIndex: 0 }],
  safety: { safe: true, categories: [], reason: 'ok' },
});

describe('generatePracticeItems', () => {
  it('returns items that passed the checks and the verifier', async () => {
    const callModel = vi.fn<CallPracticeModel>(async () => ({ items: [rawItem(2), rawItem(3)] }));
    const callVerifier = vi.fn<CallVerifierModel>(agree);
    const out = await generatePracticeItems(request, { callModel, callVerifier });
    expect(out.ok).toBe(true);
    expect(out.items.map((i) => i.question.question)).toEqual([
      'Why were the 2 dogs wet?',
      'Why were the 3 dogs wet?',
    ]);
    expect(callModel).toHaveBeenCalledTimes(1);
    expect(callVerifier).toHaveBeenCalledTimes(2);
    // The verifier sees the hint and explanation, but never the answer key or the tags.
    const sent = callVerifier.mock.calls[0]![0].prompt;
    expect(sent).toContain('- Look at what the dogs did all day.');
    expect(sent).not.toContain('answerIndex');
    expect(sent).not.toContain('not_stated');
  });

  it('asks again for only the missing items, with the reasons and no repeats', async () => {
    const callModel = vi
      .fn<CallPracticeModel>()
      .mockResolvedValueOnce({ items: [rawItem(2), { ...rawItem(3), hint: '' }] })
      .mockResolvedValueOnce({ items: [rawItem(4)] });
    const out = await generatePracticeItems(request, { callModel, callVerifier: agree });
    expect(out.ok).toBe(true);
    expect(out.items).toHaveLength(2);
    const second = callModel.mock.calls[1]![0].prompt;
    expect(second).toContain('Write 1 practice items');
    expect(second).toContain('- Why were the 2 dogs wet?');
    expect(second).toContain('The hint must be one sentence');
  });

  it('drops an item the verifier flags, and fails visibly when tries run out', async () => {
    const callModel = vi.fn<CallPracticeModel>(async () => ({ items: [rawItem(2)] }));
    const callVerifier: CallVerifierModel = async () => ({
      answers: [{ question: 1, answerIndex: 0 }],
      safety: { safe: false, categories: ['fear'], reason: 'scary' },
    });
    const out = await generatePracticeItems({ ...request, count: 1 }, { callModel, callVerifier });
    expect(out).toMatchObject({ ok: false, items: [], tries: 3 });
    expect(!out.ok && out.failures.map((f) => f.code)).toEqual(['not_verified']);
    expect(callModel).toHaveBeenCalledTimes(3);
  });

  it('keeps check items away from the practice items it was given', async () => {
    const callModel = vi.fn<CallPracticeModel>(async () => ({ items: [rawItem(2), rawItem(5)] }));
    const out = await generatePracticeItems(
      {
        ...request,
        kind: 'check',
        count: 1,
        avoid: [{ passage: passage(2), question: 'Why were the 2 dogs wet?' }],
      },
      { callModel, callVerifier: agree },
    );
    expect(out.ok).toBe(true);
    expect(out.items.map((i) => i.question.question)).toEqual(['Why were the 5 dogs wet?']);
    expect(out.items[0]!.hint).toBeNull();
  });

  it('treats a throwing generator as a failed try without leaking its message', async () => {
    const callModel = vi.fn<CallPracticeModel>(async () => {
      throw new Error('gateway echoed SENTINEL');
    });
    const out = await generatePracticeItems(request, {
      callModel,
      callVerifier: agree,
      maxTries: 2,
    });
    expect(out.ok).toBe(false);
    expect(JSON.stringify(out)).not.toContain('SENTINEL');
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});
