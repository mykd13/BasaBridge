import { describe, expect, it } from 'vitest';
import { checkStory, type CheckFailure } from './checks';
import { failureFeedback, MAX_STORY_TRIES, runWithChecks } from './retry';

const failure = (over: Partial<CheckFailure> = {}): CheckFailure => ({
  code: 'too_long',
  message: 'The passage had 61 words but must have 25-50.',
  ...over,
});

describe('failureFeedback', () => {
  it('returns nothing when there are no failures', () => {
    expect(failureFeedback([])).toBe('');
  });

  it('lists story-level and question-level problems once each', () => {
    const text = failureFeedback([
      failure(),
      failure(),
      failure({
        code: 'evidence_missing',
        message: 'The evidence is not in the passage.',
        questionIndex: 1,
      }),
    ]);
    expect(text).toContain('- The passage had 61 words but must have 25-50.');
    expect(text).toContain('- Question 2: The evidence is not in the passage.');
    expect(text.match(/61 words/g)).toHaveLength(1);
  });

  it('caps the number of problems listed', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      failure({ code: 'bad_shape', message: 'Bad.', questionIndex: i }),
    );
    const lines = failureFeedback(many).split('\n');
    expect(lines.at(-1)).toBe('- 4 more problems.');
    expect(lines).toHaveLength(1 + 8 + 1);
  });
});

describe('failureFeedback privacy', () => {
  // A name-like token in the passage, in a question and in the model's evidence and vocabulary word.
  const passage =
    'Marisol and her uncle Teodoro have a boat. Every morning, Marisol rows the boat. The sea is calm.';
  const bad = (extra: Record<string, unknown>) => ({
    skill: 'vocabulary',
    word: 'Teodoro',
    question: 'What does Marisol call her uncle Teodoro?',
    options: ['Marisol', 'Teodoro', 'Marisol Reyes', 'reyes_m'],
    answerIndex: 9,
    evidence: 'Marisol rows',
    ...extra,
  });

  const feedback = () => {
    const r = checkStory(
      passage,
      [bad({}), bad({ question: 'Where is Marisol?', word: 'Zxqv' })],
      24,
    );
    expect(r.ok).toBe(false);
    return r.ok ? '' : failureFeedback(r.failures);
  };

  it('never repeats a name-like token from the passage or the questions', () => {
    const text = feedback();
    for (const token of ['Marisol', 'Teodoro', 'Reyes', 'reyes_m', 'Zxqv', 'rows']) {
      expect(text.toLowerCase()).not.toContain(token.toLowerCase());
    }
  });

  it('uses only the closed list of wordings', () => {
    const allowed = [
      /^The last try failed these checks\. Fix them and write the story again\.$/,
      /^- The passage had \d+ words but must have \d+-\d+\.$/,
      /^- The passage was too hard \(reading grade \d+\.\d, maximum [\d.]+\)\.$/,
      /^- Only \d+ valid questions; need at least \d+\.$/,
      /^- Question \d+: (The question is missing a field or has the wrong number of options\.|The question has options that repeat\.|The answer does not point at one of the options\.|The evidence is not in the passage word for word\.|The evidence must be a whole sentence from the passage\.|The vocabulary word is not in the passage\.|The question repeats an earlier question\.)$/,
      /^- \d+ more problems\.$/,
    ];
    for (const line of feedback().split('\n')) {
      expect(
        allowed.some((re) => re.test(line)),
        line,
      ).toBe(true);
    }
  });
});

describe('runWithChecks', () => {
  const pass = () => ({ ok: true as const });
  const fail = (message: string) => ({
    ok: false as const,
    failures: [failure({ message })],
  });

  it('returns the first candidate that passes', async () => {
    const r = await runWithChecks({ attempt: async () => 'story', check: pass });
    expect(r).toEqual({ ok: true, value: 'story', checked: { ok: true }, tries: 1 });
  });

  it('retries with the feedback from the previous failure', async () => {
    const reasons: (string | undefined)[] = [];
    const candidates = ['a', 'b', 'c'];
    const r = await runWithChecks({
      attempt: async (reason) => {
        reasons.push(reason);
        return candidates[reasons.length - 1] as string;
      },
      check: (c) => (c === 'c' ? pass() : fail(`problem with ${c}`)),
    });
    expect(r).toMatchObject({ ok: true, value: 'c', tries: 3 });
    expect(reasons[0]).toBeUndefined();
    expect(reasons[1]).toContain('problem with a');
    expect(reasons[1]).not.toContain('problem with b');
    expect(reasons[2]).toContain('problem with b');
  });

  it('stops after the last try and returns the last failures', async () => {
    let calls = 0;
    const r = await runWithChecks({
      attempt: async () => ++calls,
      check: (n) => fail(`try ${n}`),
    });
    expect(calls).toBe(MAX_STORY_TRIES);
    expect(MAX_STORY_TRIES).toBe(3);
    expect(r).toEqual({ ok: false, failures: [failure({ message: 'try 3' })], tries: 3 });
  });

  it('honours maxTries and always tries at least once', async () => {
    let calls = 0;
    const r = await runWithChecks({
      attempt: async () => ++calls,
      check: () => fail('no'),
      maxTries: 0,
    });
    expect(calls).toBe(1);
    expect(r.ok).toBe(false);
  });

  it('keeps the checked result so callers get the kept questions', async () => {
    const r = await runWithChecks({
      attempt: async () => 'x',
      check: () => ({ ok: true as const, questions: [1, 2] }) as { ok: true; questions: number[] },
    });
    expect(r.ok && r.checked.questions).toEqual([1, 2]);
  });
});
