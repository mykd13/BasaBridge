import { describe, expect, it } from 'vitest';
import {
  LEARN_RULES,
  UnknownLessonError,
  createRegistry,
  finishLesson,
  learnItemMovesLevel,
  lessonStatus,
  memoryLessonProgressStore,
  openLesson,
  recordStoryRechecks,
  type LessonProgressStore,
} from './index';

const file = (id: string, subject: string, status = 'reviewed') => ({
  id,
  subject,
  band: 'early',
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

const registry = createRegistry([
  file('cause', 'cause_effect'),
  file('draft', 'feelings', 'draft'),
]);
const learner = '00000000-0000-4000-8000-000000000001';
const at = (minutes: number) => new Date(Date.UTC(2026, 9, 18, 9, minutes));

describe('lesson progress through the store', () => {
  it('opens, finishes and learns a lesson from a real story', async () => {
    const store = memoryLessonProgressStore();
    expect(lessonStatus(await openLesson(store, registry, learner, 'cause'))).toBe('in_progress');
    await finishLesson(store, registry, learner, 'cause', at(5));
    const [waiting] = await store.list(learner);
    expect(lessonStatus(waiting)).toBe('waiting_for_story');

    await recordStoryRechecks(store, registry, learner, {
      finishedAt: at(30),
      answers: [
        { subskill: 'cause_effect', correct: true },
        { subskill: 'cause_effect', correct: true },
      ],
    });
    const [learned] = await store.list(learner);
    expect(lessonStatus(learned)).toBe('learned');
  });

  it('refuses a draft or unknown lesson', async () => {
    const store = memoryLessonProgressStore();
    await expect(openLesson(store, registry, learner, 'draft')).rejects.toThrow(UnknownLessonError);
    await expect(finishLesson(store, registry, learner, 'nope', at(0))).rejects.toThrow(
      UnknownLessonError,
    );
    expect(await store.list(learner)).toEqual([]);
  });
});

describe('practice inside Learn never changes the level', () => {
  it('is the rule', () => {
    expect(LEARN_RULES.practiceChangesLevel).toBe(false);
  });

  it('practice and check items are never level evidence', () => {
    for (const kind of ['practice', 'check'] as const) {
      for (const correct of [true, false]) {
        expect(learnItemMovesLevel({ source: 'learn', kind, correct })).toBe(false);
      }
    }
  });

  it('a whole lesson only ever writes lesson progress', async () => {
    const memory = memoryLessonProgressStore();
    const calls: string[] = [];
    // A store with only list and save: Learn has no method that could touch a level.
    const store: LessonProgressStore = {
      list: (id) => (calls.push('list'), memory.list(id)),
      save: (id, row) => (
        calls.push(`save:${Object.keys(row).sort().join(',')}`),
        memory.save(id, row)
      ),
    };
    await openLesson(store, registry, learner, 'cause');
    await finishLesson(store, registry, learner, 'cause', at(1));
    const saves = calls.filter((c) => c.startsWith('save'));
    expect(saves.length).toBe(2);
    for (const s of saves) {
      expect(s).toBe('save:completedAt,lessonId,recheckCorrect,recheckTotal');
    }
  });
});
