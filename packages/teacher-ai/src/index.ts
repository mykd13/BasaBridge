/**
 * Teacher notes written by the AI from facts that code has already worked out
 * (docs/PLAN.md section 7). Owner: Jhade (BB-20, BB-28).
 * Names, usernames and audio are never sent to the model.
 */
import { gapsFromMisses, type Lesson, recommend } from '@basabridge/learn';
import { checkNotes } from './checks';
import { notesModelFromEnv, type NotesModel } from './model';
import { buildNotesPrompt } from './prompt';
import {
  type FallbackReason,
  type LessonLink,
  ModelNotes,
  type NotesFacts,
  NotesInput,
  type TeacherNotes,
} from './schema';
import {
  standardActivity,
  standardChildMessage,
  standardWhatHappened,
  standardWhyFocus,
} from './standard';

export * from './checks';
export * from './model';
export * from './prompt';
export * from './schema';
export * from './standard';

/** Shape and length check for model output. Anything that fails falls back to standard wording. */
export function isValidNotes(p: unknown): boolean {
  return ModelNotes.safeParse(p).success;
}

export interface WriteNotesOptions {
  /** Defaults to the model named in NOTES_MODEL. null means use standard wording. */
  model?: NotesModel | null;
  /** The Learn lesson registry (BB-53). Only reviewed lessons are linked. */
  lessons?: Lesson[];
}

/**
 * The lesson for the learner's main gap, chosen by code from missed questions and tricky words.
 * The model never picks or writes the link.
 */
export function lessonFor(f: NotesFacts, lessons: Lesson[]): LessonLink | null {
  const gaps = gapsFromMisses({
    misses: f.missed.map((m) => ({ subskill: m.subskill, distractor: m.distractor })),
    flaggedWords: f.flaggedWords,
    wordsRightShare:
      f.wordsRight != null && f.wordsTotal != null ? f.wordsRight / f.wordsTotal : undefined,
  });
  const lesson = recommend(gaps, f.levelAfter, lessons, 1)[0];
  return lesson ? { id: lesson.id, title: lesson.title } : null;
}

export function standardNotes(
  f: NotesFacts,
  lesson: LessonLink | null,
  fallbackReason: FallbackReason,
): TeacherNotes {
  return {
    childMessage: standardChildMessage(f),
    whatHappened: standardWhatHappened(f),
    whyFocus: standardWhyFocus(f),
    homeActivity: standardActivity(f.focus),
    lesson,
    source: 'standard',
    fallbackReason,
  };
}

/**
 * Ask the model for notes, check shape, length and tone, and fall back to standard wording on any
 * failure. Never throws for a model problem; the caller always gets notes it can show.
 */
export async function writeNotes(
  input: NotesInput,
  options: WriteNotesOptions = {},
): Promise<TeacherNotes> {
  const facts = NotesInput.parse(input);
  const lesson = lessonFor(facts, options.lessons ?? []);
  const model = options.model === undefined ? notesModelFromEnv() : options.model;
  if (!model) return standardNotes(facts, lesson, 'not_configured');

  let raw: unknown;
  try {
    raw = await model(buildNotesPrompt(facts));
  } catch {
    // Nothing is logged here: the error can echo the prompt back.
    return standardNotes(facts, lesson, 'call_failed');
  }

  const checked = checkNotes(raw, facts);
  if (!checked.ok) return standardNotes(facts, lesson, checked.reason);
  const n = checked.notes;
  return {
    childMessage: n.childMessage,
    whatHappened: n.whatHappened,
    whyFocus: n.whyFocus,
    homeActivity: { ...n.homeActivity, source: 'ai' },
    lesson,
    source: 'ai',
    fallbackReason: null,
  };
}
