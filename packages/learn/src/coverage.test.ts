import { describe, expect, it } from 'vitest';
import { LESSON_SUBJECTS, formatCoverage, lessonCoverage } from './coverage';
import { LESSON_FILES } from './lessons';

const file = (id: string, subject: string, band: string, status = 'reviewed') => ({
  id,
  subject,
  band,
  title: { en: id, fil: id },
  goal: { en: 'goal', fil: 'layunin' },
  steps: [{ kind: 'explain', text: { en: 'text', fil: 'teksto' } }],
  status,
});

describe('lessonCoverage', () => {
  it('has 33 slots: nine sub-skills, word practice and decoding in three bands', () => {
    expect(LESSON_SUBJECTS).toHaveLength(11);
    expect(LESSON_SUBJECTS).toContain('word_practice');
    expect(LESSON_SUBJECTS).toContain('decoding');
    const c = lessonCoverage([]);
    expect(c.slots).toHaveLength(33);
    expect(c.counts).toEqual({ missing: 33, draft: 0, reviewed: 0 });
    expect(c.complete).toBe(false);
  });

  it('marks a slot reviewed when any of its lessons is reviewed, else draft', () => {
    const c = lessonCoverage([
      file('cause-early', 'cause_effect', 'early'),
      file('cause-early-two', 'cause_effect', 'early', 'draft'),
      file('decoding-middle', 'decoding', 'middle', 'draft'),
    ]);
    const slot = (subject: string, band: string) =>
      c.slots.find((s) => s.subject === subject && s.band === band)!;
    expect(slot('cause_effect', 'early')).toMatchObject({
      state: 'reviewed',
      lessonIds: ['cause-early', 'cause-early-two'],
    });
    expect(slot('decoding', 'middle').state).toBe('draft');
    expect(slot('decoding', 'early').state).toBe('missing');
    expect(c.counts).toEqual({ missing: 31, draft: 1, reviewed: 1 });
  });

  it('is complete only when every slot is reviewed', () => {
    const all = ['early', 'middle', 'advanced'].flatMap((band) =>
      LESSON_SUBJECTS.map((subject) =>
        file(`${subject.replaceAll('_', '-')}-${band}`, subject, band),
      ),
    );
    expect(lessonCoverage(all).complete).toBe(true);
    expect(lessonCoverage(all.slice(1)).complete).toBe(false);
  });

  it('prints one row per subject and a summary', () => {
    const text = formatCoverage(
      lessonCoverage([file('feelings-advanced', 'feelings', 'advanced')]),
    );
    const lines = text.split('\n');
    expect(lines[0]).toMatch(/^subject\s+early\s+middle\s+advanced$/);
    expect(lines.find((l) => l.startsWith('feelings'))).toMatch(/missing\s+missing\s+reviewed$/);
    expect(lines.at(-1)).toBe('1 of 33 reviewed, 0 draft, 32 missing');
  });

  it('runs on the lesson files in the repo', () => {
    expect(lessonCoverage(LESSON_FILES).slots).toHaveLength(33);
  });
});
