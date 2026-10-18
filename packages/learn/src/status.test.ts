import { describe, expect, it } from 'vitest';
import {
  createRegistry,
  learnHome,
  lessonStatus,
  rechecksRemaining,
  type LessonProgressRow,
} from './index';

const done = new Date('2026-10-18T00:00:00Z');
const row = (
  lessonId: string,
  completedAt: Date | null,
  recheckCorrect = 0,
  recheckTotal = 0,
): LessonProgressRow => ({ lessonId, completedAt, recheckCorrect, recheckTotal });

const file = (id: string, subject: string, band: string, status = 'reviewed') => ({
  id,
  subject,
  band,
  title: id,
  goal: 'goal',
  steps: [
    { kind: 'explain', text: 'text' },
    { kind: 'example', passage: 'passage', point: 'point' },
    { kind: 'practice', items: 3 },
    { kind: 'check', items: 2 },
  ],
  status,
  reviewedBy: 'reviewer',
});

describe('lessonStatus', () => {
  it('is new without a row and in progress once opened', () => {
    expect(lessonStatus(undefined)).toBe('new');
    expect(lessonStatus(row('a', null))).toBe('in_progress');
  });

  it('waits for the next story after the lesson is finished', () => {
    expect(lessonStatus(row('a', done))).toBe('waiting_for_story');
    expect(lessonStatus(row('a', done, 1, 1))).toBe('waiting_for_story');
    expect(rechecksRemaining(row('a', done, 1, 1))).toBe(1);
  });

  it('is learned only when isLearned is true', () => {
    expect(lessonStatus(row('a', done, 2, 2))).toBe('learned');
  });

  it('goes back to in progress when the recheck did not go well', () => {
    expect(lessonStatus(row('a', done, 0, 2))).toBe('in_progress');
    expect(rechecksRemaining(row('a', done, 0, 2))).toBe(0);
  });

  it('never counts rechecks on an unfinished lesson', () => {
    expect(rechecksRemaining(row('a', null, 0, 0))).toBe(0);
  });
});

describe('learnHome', () => {
  const registry = createRegistry([
    file('cause-early', 'cause_effect', 'early'),
    file('detail-early', 'key_detail', 'early'),
    file('feel-early', 'feelings', 'early'),
    file('seq-early', 'sequence', 'early', 'draft'),
  ]);
  const gaps = [
    { subject: 'cause_effect' as const, misses: 3, reasons: [] },
    { subject: 'key_detail' as const, misses: 2, reasons: [] },
    { subject: 'feelings' as const, misses: 1, reasons: [] },
    { subject: 'sequence' as const, misses: 1, reasons: [] },
  ];

  it('starts empty with no lessons and no gaps', () => {
    expect(learnHome({ gaps: [], level: 5, registry: createRegistry([]), progress: [] })).toEqual({
      recommended: [],
      all: [],
    });
  });

  it('lists every reviewed lesson with its status', () => {
    const home = learnHome({
      gaps: [],
      level: 5,
      registry,
      progress: [row('cause-early', done, 2, 2), row('detail-early', done)],
    });
    expect(home.all.map((c) => [c.lesson.id, c.status])).toEqual([
      ['cause-early', 'learned'],
      ['detail-early', 'waiting_for_story'],
      ['feel-early', 'new'],
    ]);
  });

  it('recommends open lessons for the gaps and skips learned, waiting and draft ones', () => {
    const home = learnHome({
      gaps,
      level: 5,
      registry,
      progress: [row('cause-early', done, 2, 2), row('detail-early', done)],
    });
    expect(home.recommended.map((c) => [c.lesson.id, c.status])).toEqual([['feel-early', 'new']]);
  });

  it('recommends a lesson again after a recheck that did not go well', () => {
    const home = learnHome({
      gaps,
      level: 5,
      registry,
      progress: [row('cause-early', done, 0, 2)],
    });
    expect(home.recommended[0]).toMatchObject({
      lesson: { id: 'cause-early' },
      status: 'in_progress',
    });
  });
});
