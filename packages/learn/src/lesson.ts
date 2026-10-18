/**
 * The shape of a lesson file (docs/PLAN.md section 6.3). Lessons are written and reviewed by
 * people (BB-53), stored as JSON in `src/lessons`, and validated here before they reach a learner.
 *
 * Fixed shape: a goal in the learner's words, a short explanation with a tiny example, guided
 * practice, then a check with fresh questions. Practice and check items are generated and verified
 * like stories (BB-54), so a lesson file only says how many there are.
 */
import { SubSkill } from '@basabridge/contracts';
import { z } from 'zod';

export const LessonSubject = z.union([SubSkill, z.enum(['decoding', 'word_practice'])]);
export type LessonSubject = z.infer<typeof LessonSubject>;

export const Band = z.enum(['early', 'middle', 'advanced']);
export type Band = z.infer<typeof Band>;

export const LessonStep = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('explain'), text: z.string().min(1) }),
  z.object({ kind: z.literal('example'), passage: z.string().min(1), point: z.string().min(1) }),
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
  title: z.string().min(1),
  /** One sentence in the learner's words: what you will be able to do. */
  goal: z.string().min(1),
  steps: z.array(LessonStep).min(1),
  /** Only reviewed lessons are ever shown to learners. */
  status: LessonStatus,
  reviewedBy: z.string().min(1).optional(),
});
export type Lesson = z.infer<typeof Lesson>;

const ORDER: Record<LessonStep['kind'], number> = { explain: 0, example: 1, practice: 2, check: 3 };

/**
 * A lesson file as it must be on disk. A reviewed lesson names its reviewer and follows the full
 * shape in order: explain, example, practice, check. Drafts only need to parse.
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
