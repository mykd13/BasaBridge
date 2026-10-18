/**
 * Teacher notes written by the AI from facts that code has already worked out
 * (docs/PLAN.md section 7). Owner: Jhade (BB-20, BB-28).
 * Names, usernames and audio are never sent to the model.
 */
import { Decision } from '@basabridge/contracts';
import { gapsFromMisses, type Lesson, recommend } from '@basabridge/learn';
import { checkNotes } from './checks';
import { notesModelFromEnv, type NotesModel } from './model';
import { buildNotesPrompt, notesFacts } from './prompt';
import {
  type FallbackReason,
  type LessonLink,
  type NotesFacts,
  NotesInput,
  type NotesSource,
  type TeacherNotes,
} from './schema';
import {
  standardActivity,
  standardChildMessage,
  standardWhatHappened,
  standardWhyFocus,
} from './standard';
import { type NotesStyle, say } from './wording';

export * from './checks';
export * from './model';
export * from './prompt';
export * from './schema';
export * from './standard';
export * from './wording';

function isTimeout(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
}

export interface WriteNotesOptions extends NotesStyle {
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
  style: NotesStyle = {},
): TeacherNotes {
  return {
    childMessage: standardChildMessage(f, style),
    whatHappened: standardWhatHappened(f, style),
    whyFocus: standardWhyFocus(f, style),
    homeActivity: standardActivity(f.focus, style),
    lesson,
    source: 'standard',
    fallbackReason,
  };
}

/** How parents see where the wording came from. The AI label matches the parent screens. */
export const NOTE_SOURCE_LABEL: Record<NotesSource, string> = {
  ai: say('notes.source.ai'),
  standard: say('notes.source.standard'),
};

/**
 * The `decisions` row for a set of notes, so every note is stored with its source and the facts
 * it was written from. The caller saves it with the learner id through the authorization layer.
 */
export function notesDecision(
  notes: TeacherNotes,
  input: NotesInput,
  style: NotesStyle = {},
): Decision {
  const label = say(`notes.source.${notes.source}`, {}, { ...style, wording: 'standard' });
  return Decision.parse({
    kind: 'plan',
    title: label,
    summary: `${label}. ${say(
      input.focus == null ? 'notes.decision.noFocus' : 'notes.decision.rule',
      {},
      { ...style, wording: 'standard' },
    )}`,
    evidence: {
      source: notes.source,
      fallbackReason: notes.fallbackReason,
      facts: notesFacts(input),
      notes: {
        childMessage: notes.childMessage,
        whatHappened: notes.whatHappened,
        whyFocus: notes.whyFocus,
        homeActivity: notes.homeActivity,
      },
      lessonId: notes.lesson?.id ?? null,
    },
  });
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
  const style: NotesStyle = { lang: options.lang, wording: options.wording };
  const model = options.model === undefined ? notesModelFromEnv() : options.model;
  if (!model) return standardNotes(facts, lesson, 'not_configured', style);

  // Built outside the try so a bug in the prompt is not mistaken for a model failure.
  const prompt = buildNotesPrompt(facts, style);
  let raw: unknown;
  try {
    raw = await model(prompt);
  } catch (error) {
    // Nothing is logged here: the error can echo the prompt back.
    return standardNotes(facts, lesson, isTimeout(error) ? 'timeout' : 'call_failed', style);
  }

  const checked = checkNotes(raw, facts);
  if (!checked.ok) return standardNotes(facts, lesson, checked.reason, style);
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
