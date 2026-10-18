import { afterEach, describe, expect, it } from 'vitest';
import { resetStudentData, setStudentData, student, unwiredStudentData } from './data';
import { fakeStudentData, home, question } from './test-fixtures';

afterEach(resetStudentData);

const LEARNER = '00000000-0000-4000-8000-000000000001';

describe('student data seam', () => {
  it('says unavailable for everything until the engine is wired in', async () => {
    expect(await student.home(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await student.reading(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await student.question(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await student.placement(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('returns what a registered implementation gives, checked by the schema', async () => {
    setStudentData(fakeStudentData());
    expect(await student.home(LEARNER)).toEqual({ ok: true, data: home });
  });

  it('passes the learner id and the stop-early mode through', async () => {
    const seen: unknown[] = [];
    setStudentData(
      fakeStudentData({
        getReading: async (id, opts) => {
          seen.push(id, opts);
          return { ok: false, reason: 'none' };
        },
      }),
    );
    expect(await student.reading(LEARNER, 'rest')).toEqual({ ok: false, reason: 'none' });
    expect(seen).toEqual([LEARNER, { mode: 'rest' }]);
  });

  it('treats a payload that does not match the schema as unavailable', async () => {
    setStudentData(
      fakeStudentData({
        getStudentHome: async () => ({ ok: true, data: { ...home, level: 0 } }),
      }),
    );
    expect(await student.home(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('treats an implementation that throws as unavailable', async () => {
    setStudentData(
      fakeStudentData({
        getAnalysis: async () => {
          throw new Error('boom');
        },
        markMisheard: async () => {
          throw new Error('boom');
        },
      }),
    );
    expect(await student.analysis(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
    expect(await student.markMisheard(LEARNER, { index: 1 })).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('never lets an answer key or evidence sentence reach a question screen', async () => {
    // A careless implementation sends the whole stored question. The schema drops the extras.
    setStudentData(
      fakeStudentData({
        getQuestion: async () => ({
          ok: true,
          data: { ...question, answerIndex: 0, evidence: 'Lia checks the tree.', story: 'text' },
        }),
      }),
    );
    const result = await student.question(LEARNER);
    expect(result.ok).toBe(true);
    const json = JSON.stringify(result);
    expect(json).not.toContain('answerIndex');
    expect(json).not.toContain('evidence');
    expect(json).not.toContain('"story"');
    expect(json).not.toContain('Lia checks');
  });

  it('rejects a question with a missing id', async () => {
    setStudentData(
      fakeStudentData({
        getQuestion: async () => ({ ok: true, data: { ...question, questionId: 'nope' } }),
      }),
    );
    expect(await student.question(LEARNER)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('keeps the default implementation complete', () => {
    expect(Object.keys(unwiredStudentData).sort()).toEqual(Object.keys(fakeStudentData()).sort());
  });
});
