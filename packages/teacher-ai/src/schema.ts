/**
 * Shapes for teacher notes. The input holds only facts that code has already worked out:
 * counts, missed questions by skill, the level before and after, and the focus skill.
 * It has no field for names, usernames, email or audio, and parsing drops any extra keys.
 */
import {
  ComprehensionSkill,
  DistractorType,
  HomeActivity,
  Level,
  SubSkill,
} from '@basabridge/contracts';
import { z } from 'zod';

export const MissedQuestion = z.object({
  skill: ComprehensionSkill,
  subskill: SubSkill.optional(),
  /** Why the chosen option was wrong, when the question was tagged. */
  distractor: DistractorType.nullable().optional(),
});
export type MissedQuestion = z.infer<typeof MissedQuestion>;

const StoryWord = /^[\p{L}']+$/u;

const NotesInputShape = z.object({
  /** Level when the story was read, and after code applied the level rules. */
  levelBefore: Level,
  levelAfter: Level,
  /** Pass rule result from packages/levels. */
  passed: z.boolean(),
  correct: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  /** Counted try, when voice was available. */
  wordsRight: z.number().int().nonnegative().nullable().default(null),
  wordsTotal: z.number().int().positive().nullable().default(null),
  missed: z.array(MissedQuestion).default([]),
  /** Story words the reading analysis marked as tricky. Letters and apostrophes only; anything else is dropped before it can reach a model. */
  flaggedWords: z
    .array(z.string())
    .default([])
    .transform((ws) => ws.filter((w) => w.length <= 40 && StoryWord.test(w)).slice(0, 10)),
  /** Chosen by packages/mastery. The AI explains it and never changes it. */
  focus: ComprehensionSkill.nullable(),
});
export const NotesInput = NotesInputShape.superRefine((v, ctx) => {
  if (v.correct > v.total) {
    ctx.addIssue({ code: 'custom', path: ['correct'], message: 'correct cannot exceed total' });
  }
  if ((v.wordsRight == null) !== (v.wordsTotal == null)) {
    ctx.addIssue({
      code: 'custom',
      path: ['wordsTotal'],
      message: 'give both word counts or neither',
    });
  } else if (v.wordsRight != null && v.wordsTotal != null && v.wordsRight > v.wordsTotal) {
    ctx.addIssue({
      code: 'custom',
      path: ['wordsRight'],
      message: 'wordsRight cannot exceed wordsTotal',
    });
  }
});
export type NotesInput = z.input<typeof NotesInput>;
export type NotesFacts = z.output<typeof NotesInput>;

const text = (max: number) => z.string().trim().min(1).max(max);

/** The contract's home activity without `source`, with tighter text lengths for the model. */
const ModelActivity = HomeActivity.omit({ source: true }).extend({
  title: text(60),
  minutes: HomeActivity.shape.minutes.default(5),
  steps: z.array(text(240)).pipe(HomeActivity.shape.steps),
  tip: text(240),
});

/** What the model must return. Lengths keep notes short enough for a child and a busy parent. */
export const ModelNotes = z.object({
  childMessage: text(320),
  whatHappened: text(500),
  whyFocus: text(320),
  homeActivity: ModelActivity,
});
export type ModelNotes = z.output<typeof ModelNotes>;

export type NotesSource = 'ai' | 'standard';

/** Why standard wording was used instead of the model's notes. */
export type FallbackReason =
  'not_configured' | 'timeout' | 'call_failed' | 'invalid_shape' | 'tone';

export interface LessonLink {
  id: string;
  title: string;
}

export interface TeacherNotes {
  /** Kid-friendly note. No scores or numbers. */
  childMessage: string;
  /** Parent summary. */
  whatHappened: string;
  /** Why the focus skill was chosen, for the parent. */
  whyFocus: string;
  homeActivity: HomeActivity;
  /** A reviewed Learn lesson for the learner's main gap, chosen by code (BB-52). */
  lesson: LessonLink | null;
  source: NotesSource;
  fallbackReason: FallbackReason | null;
}
