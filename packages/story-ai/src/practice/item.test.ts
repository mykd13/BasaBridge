import { describe, expect, it } from 'vitest';
import { checkPracticeBatch, type PracticeSpec, type RawPracticeItem } from './item';

// Labelled sample text for tests only.
const PASSAGE =
  'Ana had a small dog. The dog ran to the gate. Ana saw the dog was wet. It had played in the rain all day.';
const EVIDENCE = 'It had played in the rain all day.';

const spec: PracticeSpec = { kind: 'practice', level: 12, subskill: 'cause_effect' };

const item = (
  over: Partial<RawPracticeItem> = {},
  q: Record<string, unknown> = {},
): RawPracticeItem => ({
  passage: PASSAGE,
  question: {
    skill: 'inferential',
    subskill: 'cause_effect',
    word: null,
    question: 'Why was the dog wet?',
    options: ['It played in the rain.', 'It took a bath.', 'It swam in a lake.', 'It was hot.'],
    answerIndex: 0,
    distractors: [null, 'not_stated', 'not_stated', 'opposite'],
    evidence: EVIDENCE,
    ...q,
  },
  hint: 'Look at what the dog did all day.',
  explanation: 'The last sentence says the dog played in the rain, so it got wet.',
  ...over,
});

const codes = (r: ReturnType<typeof checkPracticeBatch>) => r.dropped.map((d) => d.code);

describe('checkPracticeBatch', () => {
  it('keeps a good practice item with its hint and explanation', () => {
    const r = checkPracticeBatch({ items: [item()] }, spec);
    expect(r.dropped).toEqual([]);
    expect(r.items).toHaveLength(1);
    const [kept] = r.items;
    expect(kept!.question.evidence).toBe(EVIDENCE);
    expect(kept!.tags).toEqual({
      subskill: 'cause_effect',
      distractors: [null, 'not_stated', 'not_stated', 'opposite'],
    });
    expect(kept!.hint).toBe('Look at what the dog did all day.');
    expect(kept!.explanation).toContain('played in the rain');
  });

  it('accepts a bare array as well as { items }', () => {
    expect(checkPracticeBatch([item()], spec).items).toHaveLength(1);
    expect(checkPracticeBatch('not json', spec).items).toEqual([]);
  });

  it('drops hint and explanation from check items', () => {
    const r = checkPracticeBatch([item()], { ...spec, kind: 'check' });
    expect(r.items[0]!.hint).toBeNull();
    expect(r.items[0]!.explanation).toBeNull();
  });

  it('runs the same question checks as stories', () => {
    const r = checkPracticeBatch([item({}, { evidence: 'The cat sat on a mat.' })], spec);
    expect(r.items).toEqual([]);
    expect(codes(r)).toContain('evidence_missing');
  });

  it('rejects a passage outside the tiny-passage range or over the tier grade', () => {
    expect(codes(checkPracticeBatch([item({ passage: 'Ana had a dog.' })], spec))).toContain(
      'too_short',
    );
    const hard = `${'Extraordinarily complicated environmental circumstances necessitated considerable deliberation. '.repeat(3)}${EVIDENCE}`;
    expect(codes(checkPracticeBatch([item({ passage: hard })], spec))).toContain('too_hard');
  });

  it("requires the lesson's sub-skill and matching tags", () => {
    expect(codes(checkPracticeBatch([item({}, { subskill: 'key_detail' })], spec))).toContain(
      'wrong_subskill',
    );
    expect(codes(checkPracticeBatch([item({}, { skill: 'literal' })], spec))).toContain(
      'wrong_subskill',
    );
    expect(
      codes(
        checkPracticeBatch(
          [item({}, { distractors: ['opposite', null, 'not_stated', 'opposite'] })],
          spec,
        ),
      ),
    ).toContain('bad_tags');
    expect(codes(checkPracticeBatch([item({}, { distractors: undefined })], spec))).toContain(
      'bad_tags',
    );
  });

  it('needs a short hint that does not give the answer away', () => {
    expect(codes(checkPracticeBatch([item({ hint: '' })], spec))).toContain('bad_hint');
    expect(
      codes(checkPracticeBatch([item({ hint: 'Think: it played in the rain.' })], spec)),
    ).toContain('hint_gives_answer');
    expect(codes(checkPracticeBatch([item({ explanation: 'word '.repeat(40) })], spec))).toContain(
      'bad_explanation',
    );
  });

  it('never repeats an avoided item or an earlier one in the batch', () => {
    const avoid = [{ passage: PASSAGE.toUpperCase(), question: 'Something else?' }];
    expect(codes(checkPracticeBatch([item()], spec, avoid))).toEqual(['repeats_practice']);
    const twice = checkPracticeBatch([item(), item()], spec);
    expect(twice.items).toHaveLength(1);
    expect(twice.dropped).toEqual([
      expect.objectContaining({ code: 'repeats_practice', questionIndex: 1 }),
    ]);
  });

  it('reports a malformed entry without throwing', () => {
    const r = checkPracticeBatch([null, { passage: PASSAGE }], spec);
    expect(r.items).toEqual([]);
    expect(codes(r)).toEqual(['bad_item', 'bad_item']);
  });
});
