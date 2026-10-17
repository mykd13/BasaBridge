/**
 * The prompt for teacher notes. It is built field by field from parsed NotesInput, so anything
 * the caller adds by mistake (a name, a username, audio) never reaches the model.
 * It carries levels, counts, missed questions by skill and story words only.
 */
import { NotesInput } from './schema';
import { SKILL_WORDS } from './standard';

export interface NotesPrompt {
  instructions: string;
  prompt: string;
}

export const NOTES_INSTRUCTIONS = `You write short notes for a reading app used by children in the Philippines.
Code has already scored the reading and chosen the level and the focus skill. You only explain them.
Never change, question or predict the level, the score or the focus skill.

Write four things as JSON:
- childMessage: one or two warm sentences to the child. Simple words. No numbers, no scores, no levels as numbers, no percentages.
- whatHappened: two or three plain sentences for a parent about this story. You may use the counts given.
- whyFocus: one or two sentences for a parent on why the next stories practise the focus skill.
- homeActivity: a 3 to 15 minute activity a parent can do at home, with a title, minutes, two to four steps and a tip.

Rules:
- Be kind and specific. Never shame, blame or compare the child with others.
- Never promise a score, a level or a pass.
- Use only the numbers given in the facts.
- Do not address the child or parent by name.`;

/** The facts the model sees. Keys are listed one by one on purpose. */
export function notesFacts(input: NotesInput) {
  const f = NotesInput.parse(input);
  return {
    levelBefore: f.levelBefore,
    levelAfter: f.levelAfter,
    levelChange:
      f.levelAfter > f.levelBefore ? 'up' : f.levelAfter < f.levelBefore ? 'down' : 'same',
    passed: f.passed,
    questionsCorrect: f.correct,
    questionsTotal: f.total,
    wordsRight: f.wordsRight,
    wordsTotal: f.wordsTotal,
    missedQuestions: f.missed.map((m) => ({
      skill: m.skill,
      subskill: m.subskill ?? null,
      mistake: m.distractor ?? null,
    })),
    trickyWords: f.flaggedWords,
    focusSkill: f.focus,
    focusMeaning: f.focus ? SKILL_WORDS[f.focus] : null,
  };
}

export function buildNotesPrompt(input: NotesInput): NotesPrompt {
  return {
    instructions: NOTES_INSTRUCTIONS,
    prompt: `Facts about one finished story:\n${JSON.stringify(notesFacts(input), null, 2)}`,
  };
}
