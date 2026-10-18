import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LESSON_FILES } from './lessons';
import { LessonFileError, createRegistry, lessonRegistry } from './registry';

const reviewed = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  subject: 'cause_effect',
  band: 'early',
  title: 'Why did it happen?',
  goal: 'I can tell why something happened in a story.',
  steps: [
    { kind: 'explain', text: 'Look for the reason.' },
    { kind: 'example', passage: 'It rained, so the road got wet.', point: 'Rain made it wet.' },
    { kind: 'practice', items: 3 },
    { kind: 'check', items: 2 },
  ],
  status: 'reviewed',
  reviewedBy: 'reading specialist',
  ...extra,
});

describe('createRegistry', () => {
  it('loads reviewed lessons and leaves drafts out', () => {
    const registry = createRegistry([
      reviewed('cause-early'),
      { ...reviewed('detail-early'), status: 'draft', reviewedBy: undefined },
    ]);
    expect(registry.lessons.map((l) => l.id)).toEqual(['cause-early']);
    expect(registry.get('cause-early')?.subject).toBe('cause_effect');
    expect(registry.get('detail-early')).toBeUndefined();
  });

  it('accepts a draft that does not have the full shape yet', () => {
    const draft = {
      ...reviewed('draft-one'),
      status: 'draft',
      steps: [{ kind: 'explain', text: 'x' }],
    };
    expect(createRegistry([draft]).lessons).toEqual([]);
  });

  it('rejects a reviewed lesson without a reviewer', () => {
    expect(() => createRegistry([reviewed('a', { reviewedBy: undefined })])).toThrow(
      LessonFileError,
    );
  });

  it('rejects a reviewed lesson missing a step or with steps out of order', () => {
    const noCheck = reviewed('no-check');
    noCheck.steps = noCheck.steps.filter((s) => s.kind !== 'check');
    expect(() => createRegistry([noCheck])).toThrow(/check step/);

    const backwards = reviewed('backwards');
    backwards.steps = [...backwards.steps].reverse();
    expect(() => createRegistry([backwards])).toThrow(/in order/);
  });

  it('rejects an unknown subject, a bad id and a repeated id', () => {
    expect(() => createRegistry([reviewed('a', { subject: 'spelling' })])).toThrow(LessonFileError);
    expect(() => createRegistry([reviewed('Not An Id')])).toThrow(LessonFileError);
    expect(() => createRegistry([reviewed('twice'), reviewed('twice')])).toThrow(/used twice/);
  });
});

describe('lesson files', () => {
  const dir = new URL('./lessons/', import.meta.url);

  it('lists every JSON file in the lessons folder', () => {
    const onDisk = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => (JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { id: string }).id)
      .sort();
    const listed = LESSON_FILES.map((f) => (f as { id: string }).id).sort();
    expect(listed).toEqual(onDisk);
  });

  it('are all valid', () => {
    expect(() => lessonRegistry()).not.toThrow();
  });
});
