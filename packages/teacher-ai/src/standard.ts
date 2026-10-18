/**
 * Standard wording, used whenever the model is not configured, the call fails, or its reply
 * does not pass the shape and tone checks. Written by people, built only from code facts.
 * Every sentence is a keyed entry in wording.ts, in English and Filipino.
 */
import type { ComprehensionSkill, HomeActivity } from '@basabridge/contracts';
import type { NotesFacts } from './schema';
import { type NotesKey, type NotesStyle, say, skillKey } from './wording';

const MINUTES: Record<ComprehensionSkill, number> = { vocabulary: 5, literal: 5, inferential: 7 };

function activity(skill: ComprehensionSkill, style: NotesStyle): HomeActivity {
  const k = (part: string) => `notes.activity.${skill}.${part}` as NotesKey;
  return {
    title: say(k('title'), {}, style),
    minutes: MINUTES[skill],
    steps: [say(k('step1'), {}, style), say(k('step2'), {}, style), say(k('step3'), {}, style)],
    tip: say(k('tip'), {}, style),
    source: 'standard',
  };
}

/** English standard activities. Used whenever the AI call fails or returns something invalid. */
export const STANDARD_ACTIVITIES: Record<ComprehensionSkill, HomeActivity> = {
  vocabulary: activity('vocabulary', {}),
  literal: activity('literal', {}),
  inferential: activity('inferential', {}),
};

export function standardActivity(
  focus: ComprehensionSkill | null,
  style: NotesStyle = {},
): HomeActivity {
  const skill = focus ?? 'literal';
  return style.lang === 'fil' ? activity(skill, style) : STANDARD_ACTIVITIES[skill];
}

/** Plain-language names for the skills in English, shared by the standard wording and the prompt. */
export const SKILL_WORDS: Record<ComprehensionSkill, string> = {
  vocabulary: say('notes.skill.vocabulary'),
  literal: say('notes.skill.literal'),
  inferential: say('notes.skill.inferential'),
};

export function standardChildMessage(f: NotesFacts, style: NotesStyle = {}): string {
  if (f.levelAfter > f.levelBefore) return say('notes.child.levelUp', {}, style);
  if (f.levelAfter < f.levelBefore) return say('notes.child.levelDown', {}, style);
  if (f.passed) return say('notes.child.passed', {}, style);
  return say('notes.child.keepGoing', {}, style);
}

/** Parent wording is always standard; the simple wording is for the child's note. */
export function standardWhatHappened(f: NotesFacts, style: NotesStyle = {}): string {
  const s: NotesStyle = { ...style, wording: 'standard' };
  const parts = [say('notes.parent.answered', { correct: f.correct, total: f.total }, s)];
  if (f.wordsRight != null && f.wordsTotal != null) {
    parts.push(say('notes.parent.words', { right: f.wordsRight, total: f.wordsTotal }, s));
  }
  if (f.levelAfter > f.levelBefore) {
    parts.push(say('notes.parent.levelUp', { level: f.levelAfter }, s));
  } else if (f.levelAfter < f.levelBefore) {
    parts.push(say('notes.parent.levelDown', { level: f.levelAfter }, s));
  } else parts.push(say('notes.parent.levelSame', { level: f.levelAfter }, s));
  return parts.join(' ');
}

export function standardWhyFocus(f: NotesFacts, style: NotesStyle = {}): string {
  const s: NotesStyle = { ...style, wording: 'standard' };
  if (!f.focus) return say('notes.focus.none', {}, s);
  return say('notes.focus.some', { skill: say(skillKey(f.focus), {}, s) }, s);
}
