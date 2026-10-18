import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { localizeLesson } from './lesson';
import { LESSON_FILES } from './lessons';
import { LessonFileError, createRegistry, lessonRegistry } from './registry';

const reviewed = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  subject: 'cause_effect',
  band: 'early',
  title: { en: 'Why did it happen?', fil: 'Bakit ito nangyari?' },
  goal: { en: 'I can tell why something happened.', fil: 'Masasabi ko kung bakit ito nangyari.' },
  steps: [
    { kind: 'explain', text: { en: 'Look for the reason.', fil: 'Hanapin ang dahilan.' } },
    {
      kind: 'example',
      passage: 'It rained, so the road got wet.',
      point: { en: 'Rain made it wet.', fil: 'Basa ito dahil sa ulan.' },
    },
    { kind: 'practice', items: 3 },
    { kind: 'check', items: 2 },
  ],
  status: 'reviewed',
  reviewedBy: 'reading specialist',
  reviewedAt: '2026-10-18',
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
      steps: [{ kind: 'explain', text: { en: 'x', fil: '' } }],
      reviewedBy: undefined,
      reviewedAt: undefined,
    };
    expect(createRegistry([draft]).lessons).toEqual([]);
  });

  it('rejects a reviewed lesson without a review date or with a bad one', () => {
    expect(() => createRegistry([reviewed('a', { reviewedAt: undefined })])).toThrow(/review date/);
    expect(() => createRegistry([reviewed('a', { reviewedAt: '18/10/2026' })])).toThrow(
      LessonFileError,
    );
  });

  it('rejects a reviewed lesson with any instruction missing its Filipino', () => {
    expect(() =>
      createRegistry([reviewed('a', { goal: { en: 'I can tell why.', fil: ' ' } })]),
    ).toThrow(/goal\.fil: A reviewed lesson has Filipino instructions/);

    const noPoint = reviewed('b');
    noPoint.steps[1] = {
      kind: 'example',
      passage: 'It rained, so the road got wet.',
      point: { en: 'Rain made it wet.', fil: '' },
    };
    expect(() => createRegistry([noPoint])).toThrow(/steps\.1\.point\.fil/);
  });

  it('rejects instructions given as a plain string instead of English and Filipino', () => {
    expect(() => createRegistry([reviewed('a', { title: 'Why did it happen?' })])).toThrow(
      LessonFileError,
    );
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

describe('localizeLesson', () => {
  const lesson = createRegistry([reviewed('cause-early')]).get('cause-early')!;

  it('gives the instructions in English or Filipino and keeps the passage English', () => {
    const en = localizeLesson(lesson, 'en');
    expect(en.title).toBe('Why did it happen?');
    expect(en.steps[0]).toEqual({ kind: 'explain', text: 'Look for the reason.' });

    const fil = localizeLesson(lesson, 'fil');
    expect(fil.goal).toBe('Masasabi ko kung bakit ito nangyari.');
    expect(fil.steps[1]).toEqual({
      kind: 'example',
      passage: 'It rained, so the road got wet.',
      point: 'Basa ito dahil sa ulan.',
    });
    expect(fil.steps.slice(2)).toEqual(lesson.steps.slice(2));
    expect(fil.reviewedAt).toBe('2026-10-18');
  });

  it('falls back to English where a draft has no Filipino yet', () => {
    const draft = { ...lesson, title: { en: 'Draft title', fil: '' } };
    expect(localizeLesson(draft, 'fil').title).toBe('Draft title');
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
