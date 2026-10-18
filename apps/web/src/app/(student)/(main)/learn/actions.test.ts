import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as levels from '@basabridge/levels';
import * as mastery from '@basabridge/mastery';
import { testPort } from '@/server/learn/fixtures';

// Spy on every function mastery and levels export. Learn must not call any of them.
vi.mock('@basabridge/mastery', async (original) => {
  const real = (await original()) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(real).map(([k, v]) => [
      k,
      typeof v === 'function' ? vi.fn(v as (...a: unknown[]) => unknown) : v,
    ]),
  );
});
vi.mock('@basabridge/levels', async (original) => {
  const real = (await original()) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(real).map(([k, v]) => [
      k,
      typeof v === 'function' ? vi.fn(v as (...a: unknown[]) => unknown) : v,
    ]),
  );
});

const fake = testPort();
vi.mock('@/server/learn/live', () => ({ learnPort: () => fake.port }));
vi.mock('@/server/learn/learner', () => ({ currentLearnerId: async () => 'learner-1' }));

const { completeLessonAction, checkPracticeAction, savePositionAction } = await import('./actions');

function calls(ns: Record<string, unknown>) {
  return Object.entries(ns)
    .filter(([, v]) => vi.isMockFunction(v))
    .flatMap(([name, v]) => ((v as ReturnType<typeof vi.fn>).mock.calls.length ? [name] : []));
}

describe('Learn actions never touch a level', () => {
  beforeEach(() => vi.clearAllMocks());

  it('completeLessonAction does not call mastery or level code', async () => {
    await savePositionAction('why-did-it-happen', { step: 2, item: 0 });
    const result = await completeLessonAction('why-did-it-happen');
    expect(result.recheckItems).toBe(2);
    expect(calls(mastery)).toEqual([]);
    expect(calls(levels)).toEqual([]);
  });

  it('practice checks and position saves do not either', async () => {
    await savePositionAction('why-did-it-happen', { step: 1, item: 0 });
    expect((await checkPracticeAction('item-1', 0)).correct).toBe(true);
    expect(calls(mastery)).toEqual([]);
    expect(calls(levels)).toEqual([]);
  });
});
