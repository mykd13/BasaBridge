import { describe, expect, it } from 'vitest';
import {
  LEARN_RULES,
  applyStoryToProgress,
  completeLesson,
  createRegistry,
  lessonStatus,
  rechecksForNextStory,
  startLesson,
  type LessonProgressRow,
} from './index';

const file = (id: string, subject: string) => ({
  id,
  subject,
  band: 'early',
  title: { en: id, fil: id },
  goal: { en: 'goal', fil: 'layunin' },
  steps: [
    { kind: 'explain', text: { en: 'text', fil: 'teksto' } },
    { kind: 'example', passage: 'passage', point: { en: 'point', fil: 'punto' } },
    { kind: 'practice', items: 3 },
    { kind: 'check', items: 2 },
  ],
  status: 'reviewed',
  reviewedBy: 'reviewer',
  reviewedAt: '2026-10-18',
});

const registry = createRegistry([
  file('cause', 'cause_effect'),
  file('detail', 'key_detail'),
  file('decode', 'decoding'),
]);

const t = (minutes: number) => new Date(Date.UTC(2026, 9, 18, 9, minutes));
const finished = (lessonId: string, at: Date): LessonProgressRow =>
  completeLesson(startLesson(lessonId), at);

describe('startLesson and completeLesson', () => {
  it('opens a lesson in progress and keeps an existing row', () => {
    const row = startLesson('cause');
    expect(lessonStatus(row)).toBe('in_progress');
    const done = completeLesson(row, t(0));
    expect(startLesson('cause', done)).toBe(done);
  });

  it('finishing a lesson waits for the next story', () => {
    expect(lessonStatus(finished('cause', t(0)))).toBe('waiting_for_story');
  });

  it('redoing a lesson clears a recheck that did not go well', () => {
    const failed: LessonProgressRow = {
      lessonId: 'cause',
      completedAt: t(0),
      recheckCorrect: 0,
      recheckTotal: 2,
    };
    expect(completeLesson(failed, t(5))).toEqual({
      lessonId: 'cause',
      completedAt: t(5),
      recheckCorrect: 0,
      recheckTotal: 0,
    });
  });

  it('a learned lesson stays learned when done again', () => {
    const learned = { lessonId: 'cause', completedAt: t(0), recheckCorrect: 2, recheckTotal: 2 };
    expect(completeLesson(learned, t(9))).toBe(learned);
  });
});

describe('rechecksForNextStory', () => {
  it('asks for two fresh questions on the skill of each finished lesson, oldest first', () => {
    const rows = [finished('detail', t(5)), finished('cause', t(1)), startLesson('decode')];
    expect(rechecksForNextStory(rows, registry)).toEqual([
      { lessonId: 'cause', subskill: 'cause_effect', items: LEARN_RULES.recheckItemsInNextStory },
      { lessonId: 'detail', subskill: 'key_detail', items: LEARN_RULES.recheckItemsInNextStory },
    ]);
  });

  it('asks only for what is still missing, and nothing for decoding or unknown lessons', () => {
    const rows: LessonProgressRow[] = [
      { lessonId: 'cause', completedAt: t(0), recheckCorrect: 1, recheckTotal: 1 },
      finished('decode', t(0)),
      finished('gone', t(0)),
    ];
    expect(rechecksForNextStory(rows, registry)).toEqual([
      { lessonId: 'cause', subskill: 'cause_effect', items: 1 },
    ]);
  });
});

describe('applyStoryToProgress', () => {
  it('learns a lesson from two right answers on its skill in the next story', () => {
    const rows = [finished('cause', t(0))];
    const changed = applyStoryToProgress(rows, registry, {
      finishedAt: t(10),
      answers: [
        { subskill: 'key_detail', correct: false },
        { subskill: 'cause_effect', correct: true },
        { subskill: 'cause_effect', correct: true },
        { subskill: 'cause_effect', correct: false },
      ],
    });
    expect(changed).toEqual([{ ...rows[0], recheckCorrect: 2, recheckTotal: 2 }]);
    expect(lessonStatus(changed[0])).toBe('learned');
  });

  it('does not learn a lesson when the fresh questions go badly', () => {
    const [row] = applyStoryToProgress([finished('cause', t(0))], registry, {
      finishedAt: t(10),
      answers: [
        { subskill: 'cause_effect', correct: false },
        { subskill: 'cause_effect', correct: true },
      ],
    });
    expect(lessonStatus(row)).toBe('in_progress');
  });

  it('keeps waiting when the story had only one question on the skill', () => {
    const [row] = applyStoryToProgress([finished('cause', t(0))], registry, {
      finishedAt: t(10),
      answers: [{ subskill: 'cause_effect', correct: true }],
    });
    expect(row).toMatchObject({ recheckCorrect: 1, recheckTotal: 1 });
    expect(lessonStatus(row)).toBe('waiting_for_story');
  });

  it('ignores a story finished before the lesson, and lessons not finished', () => {
    const rows = [finished('cause', t(20)), startLesson('detail')];
    expect(
      applyStoryToProgress(rows, registry, {
        finishedAt: t(10),
        answers: [
          { subskill: 'cause_effect', correct: true },
          { subskill: 'key_detail', correct: true },
        ],
      }),
    ).toEqual([]);
  });

  it('checks decoding lessons on the counted try', () => {
    const rows = [finished('decode', t(0))];
    const good = applyStoryToProgress(rows, registry, {
      finishedAt: t(10),
      answers: [],
      countedTry: { wordsRight: 45, wordsTotal: 50 },
    });
    expect(good).toEqual([{ ...rows[0], recheckCorrect: 1, recheckTotal: 1 }]);
    const silent = applyStoryToProgress(rows, registry, { finishedAt: t(10), answers: [] });
    expect(silent).toEqual([]);
  });
});
