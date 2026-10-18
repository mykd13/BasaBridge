import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LessonFile } from './lesson';
import { LESSON_FILES } from './lessons';

const template: unknown = JSON.parse(
  readFileSync(new URL('../lesson-template.json', import.meta.url), 'utf8'),
);

describe('lesson template', () => {
  it('is a valid draft with every step in order', () => {
    const lesson = LessonFile.parse(template);
    expect(lesson.status).toBe('draft');
    expect(lesson.steps.map((s) => s.kind)).toEqual(['explain', 'example', 'practice', 'check']);
  });

  it('cannot pass as reviewed until the Filipino and the review are filled in', () => {
    const asReviewed = { ...(template as object), status: 'reviewed' };
    const result = LessonFile.safeParse(asReviewed);
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toContain('A reviewed lesson names its reviewer');
    expect(messages).toContain('A reviewed lesson has a review date');
    expect(messages).toContain('A reviewed lesson has Filipino instructions');
  });

  it('is never shipped as a lesson with its placeholder text', () => {
    const placeholder = (template as { title: { en: string } }).title.en;
    const titles = LESSON_FILES.map((f) => (f as { title?: { en?: string } }).title?.en);
    expect(titles).not.toContain(placeholder);
  });
});
