import { describe, expect, it } from 'vitest';
import { TaggedQuestion } from './tags';
import { applyVerdict, buildVerifierPrompt } from './verifier';

const STORY = 'Lia checks the mango tree every morning. One day, three mangoes fall.';

const q = (question: string, answerIndex = 0): TaggedQuestion =>
  TaggedQuestion.parse({
    skill: 'literal',
    subskill: 'key_detail',
    word: null,
    question,
    options: ['The tree', 'The river', 'The school', 'The market'],
    answerIndex,
    distractors: [0, 1, 2, 3].map((i) =>
      i === answerIndex ? null : i === 3 ? 'unrelated' : 'not_stated',
    ),
    evidence: 'Lia checks the mango tree every morning.',
  });

const questions = [q('One?'), q('Two?'), q('Three?'), q('Four?'), q('Five?', 2)];
const agree = (x: TaggedQuestion) => ({ answerIndex: x.answerIndex, labels: x.distractors });
const verdict = (answers = questions.map(agree)) => ({ safe: true, safetyNote: null, answers });

describe('buildVerifierPrompt', () => {
  const prompt = buildVerifierPrompt(STORY, questions);

  it('includes the story and every question with its options', () => {
    expect(prompt).toContain(STORY);
    expect(prompt).toContain('Question 5: Five?');
    expect(prompt).toContain('  3. The market');
  });

  it('hides the answer key, the generator labels and the sub-skill', () => {
    expect(prompt).not.toContain('answerIndex": 0,');
    expect(prompt).not.toContain('key_detail');
    expect(prompt).not.toContain('evidence');
    expect(prompt).not.toMatch(/"distractors"/);
  });
});

describe('applyVerdict', () => {
  it('keeps questions where the answer and every label agree', () => {
    const r = applyVerdict(questions, verdict());
    expect(r).toEqual({ ok: true, questions, dropped: 0, labelMismatches: 0 });
  });

  it('drops a question whose answer the verifier disagrees with', () => {
    const answers = questions.map(agree);
    answers[0] = { answerIndex: 1, labels: ['wrong_detail', null, 'not_stated', 'unrelated'] };
    const r = applyVerdict(questions, verdict(answers));
    expect(r.ok && r.dropped).toBe(1);
  });

  it('keeps a confirmed question whose labels differ, and reports the mismatch', () => {
    const answers = questions.map(agree);
    answers[1] = { answerIndex: 0, labels: [null, 'opposite', 'not_stated', 'unrelated'] };
    const r = applyVerdict(questions, verdict(answers));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.questions.map((x) => x.question)).toContain('Two?');
      expect(r.labelMismatches).toBe(1);
      expect(r.dropped).toBe(0);
    }
  });

  it('fails when fewer than four questions survive', () => {
    const answers = questions.map(agree);
    answers[0] = { ...answers[0]!, answerIndex: 3 };
    answers[1] = { ...answers[1]!, answerIndex: 3 };
    expect(applyVerdict(questions, verdict(answers)).ok).toBe(false);
  });

  it('fails closed on an invalid or incomplete reply', () => {
    expect(applyVerdict(questions, { safe: true }).ok).toBe(false);
    expect(applyVerdict(questions, 'yes').ok).toBe(false);
    expect(applyVerdict(questions, verdict(questions.slice(1).map(agree))).ok).toBe(false);
    const badLabel = questions.map(agree);
    badLabel[0] = { answerIndex: 0, labels: [null, 'silly', 'opposite', 'unrelated'] } as never;
    expect(applyVerdict(questions, verdict(badLabel)).ok).toBe(false);
  });

  it('fails when the story is flagged unsafe', () => {
    const r = applyVerdict(questions, { ...verdict(), safe: false, safetyNote: 'violence' });
    expect(r).toEqual({ ok: false, reason: 'The verifier flagged the story: violence.' });
  });
});
