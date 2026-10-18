/**
 * The shape of a lesson file (docs/PLAN.md section 6.3). Lessons are written and reviewed by
 * people (BB-53), stored as JSON in `src/lessons`, and validated here before they reach a learner.
 * How to write one: packages/learn/LESSONS.md.
 *
 * Fixed shape: a goal in the learner's words, a short explanation with a tiny example, guided
 * practice, then a check with fresh questions. Practice and check items are generated and verified
 * like stories (BB-54), so a lesson file only says how many there are.
 *
 * Instructions come in English and Filipino. The example passage stays English only, because it is
 * the English text the learner is learning to read.
 */
import { SubSkill, type ReadingHelp } from '@basabridge/contracts';
import { z } from 'zod';

export const LessonSubject = z.union([SubSkill, z.enum(['decoding', 'word_practice'])]);
export type LessonSubject = z.infer<typeof LessonSubject>;

export const Band = z.enum(['early', 'middle', 'advanced']);
export type Band = z.infer<typeof Band>;

/** The learner's instruction language, from their reading help settings. */
export type LessonLanguage = ReadingHelp['language'];

/**
 * Instruction text in English and Filipino. A draft may leave the Filipino empty while the English
 * is written; a reviewed lesson needs both.
 */
export const LessonText = z.object({ en: z.string().min(1), fil: z.string() });
export type LessonText = z.infer<typeof LessonText>;

export const LessonStep = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('explain'), text: LessonText }),
  z.object({ kind: z.literal('example'), passage: z.string().min(1), point: LessonText }),
  /** Guided practice with hints and instant feedback. */
  z.object({ kind: z.literal('practice'), items: z.number().int().positive() }),
  /** Fresh questions with no hints, to see whether the idea stuck. */
  z.object({ kind: z.literal('check'), items: z.number().int().positive() }),
]);
export type LessonStep = z.infer<typeof LessonStep>;

export const LessonStatus = z.enum(['draft', 'reviewed']);
export type LessonStatus = z.infer<typeof LessonStatus>;

export const Lesson = z.object({
  /** Stable id, also the key in lesson_progress. Lowercase words joined by dashes. */
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  subject: LessonSubject,
  band: Band,
  title: LessonText,
  /** One sentence in the learner's words: what you will be able to do. */
  goal: LessonText,
  steps: z.array(LessonStep).min(1),
  /** Only reviewed lessons are ever shown to learners. */
  status: LessonStatus,
  /** The reading specialist who reviewed the lesson (BB-74). */
  reviewedBy: z.string().min(1).optional(),
  /** The day the review was done, as YYYY-MM-DD. */
  reviewedAt: z.iso.date().optional(),
});
export type Lesson = z.infer<typeof Lesson>;

const ORDER: Record<LessonStep['kind'], number> = { explain: 0, example: 1, practice: 2, check: 3 };

/** Every piece of instruction text in a lesson, with where it sits in the file. */
function textsOf(lesson: Lesson): { path: (string | number)[]; text: LessonText }[] {
  const texts: { path: (string | number)[]; text: LessonText }[] = [
    { path: ['title'], text: lesson.title },
    { path: ['goal'], text: lesson.goal },
  ];
  lesson.steps.forEach((step, i) => {
    if (step.kind === 'explain') texts.push({ path: ['steps', i, 'text'], text: step.text });
    if (step.kind === 'example') texts.push({ path: ['steps', i, 'point'], text: step.point });
  });
  return texts;
}

/**
 * A lesson file as it must be on disk. A reviewed lesson names its reviewer and the review date,
 * has every instruction in English and Filipino, and follows the full shape in order: explain,
 * example, practice, check. Drafts only need to parse.
 */
export const LessonFile = Lesson.superRefine((lesson, ctx) => {
  if (lesson.status !== 'reviewed') return;
  if (!lesson.reviewedBy) {
    ctx.addIssue({
      code: 'custom',
      path: ['reviewedBy'],
      message: 'A reviewed lesson names its reviewer',
    });
  }
  if (!lesson.reviewedAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['reviewedAt'],
      message: 'A reviewed lesson has a review date',
    });
  }
  for (const { path, text } of textsOf(lesson)) {
    if (text.fil.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'fil'],
        message: 'A reviewed lesson has Filipino instructions',
      });
    }
  }
  const kinds = lesson.steps.map((s) => s.kind);
  for (const kind of Object.keys(ORDER) as LessonStep['kind'][]) {
    if (!kinds.includes(kind)) {
      ctx.addIssue({
        code: 'custom',
        path: ['steps'],
        message: `A reviewed lesson needs a ${kind} step`,
      });
    }
  }
  const inOrder = kinds.every((k, i) => i === 0 || ORDER[kinds[i - 1]!] <= ORDER[k]);
  if (!inOrder) {
    ctx.addIssue({
      code: 'custom',
      path: ['steps'],
      message: 'Steps go in order: explain, example, practice, check',
    });
  }
});

export type LocalizedLessonStep =
  | { kind: 'explain'; text: string }
  | { kind: 'example'; passage: string; point: string }
  | { kind: 'practice'; items: number }
  | { kind: 'check'; items: number };

/** A lesson with its instructions in one language, ready for a screen. */
export interface LocalizedLesson extends Omit<Lesson, 'title' | 'goal' | 'steps'> {
  title: string;
  goal: string;
  steps: LocalizedLessonStep[];
}

function pick(text: LessonText, language: LessonLanguage): string {
  return language === 'fil' && text.fil.trim() !== '' ? text.fil : text.en;
}

/**
 * The lesson in the learner's instruction language. Reviewed lessons always have Filipino; the
 * English fallback only matters for drafts in tests and previews.
 */
export function localizeLesson(lesson: Lesson, language: LessonLanguage): LocalizedLesson {
  return {
    ...lesson,
    title: pick(lesson.title, language),
    goal: pick(lesson.goal, language),
    steps: lesson.steps.map((step): LocalizedLessonStep => {
      if (step.kind === 'explain') return { kind: 'explain', text: pick(step.text, language) };
      if (step.kind === 'example') {
        return { kind: 'example', passage: step.passage, point: pick(step.point, language) };
      }
      return step;
    }),
  };
}
