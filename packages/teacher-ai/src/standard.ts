/**
 * Standard wording, used whenever the model is not configured, the call fails, or its reply
 * does not pass the shape and tone checks. Written by people, built only from code facts.
 */
import type { ComprehensionSkill, HomeActivity } from '@basabridge/contracts';
import type { NotesFacts } from './schema';

/** Used whenever the AI call fails or returns something that does not validate. */
export const STANDARD_ACTIVITIES: Record<ComprehensionSkill, HomeActivity> = {
  vocabulary: {
    title: 'Word detective',
    minutes: 5,
    steps: [
      'Pick three words from the story that felt tricky.',
      'Ask: "What do you think it means? Which words nearby help you?"',
      'Use each word in a new sentence about your day.',
    ],
    tip: 'Say the meaning in your own words before you reach for a dictionary.',
    source: 'standard',
  },
  literal: {
    title: 'Find it in the text',
    minutes: 5,
    steps: [
      'Reread one paragraph of the story together.',
      'Ask a who, what or where question about it.',
      'Have your child point to the exact words that answer it.',
    ],
    tip: 'Pointing at the words trains the habit of checking the text.',
    source: 'standard',
  },
  inferential: {
    title: 'Clue hunt',
    minutes: 7,
    steps: [
      'Read two or three sentences together.',
      'Ask: "What is not said, but you can tell?"',
      'Ask: "Which words gave you that clue?" and find them.',
    ],
    tip: 'There is no single right answer if the child can name a clue from the text.',
    source: 'standard',
  },
};

export function standardActivity(focus: ComprehensionSkill | null): HomeActivity {
  return STANDARD_ACTIVITIES[focus ?? 'literal'];
}

/** Plain-language names for the skills, shared by the standard wording and the prompt. */
export const SKILL_WORDS: Record<ComprehensionSkill, string> = {
  vocabulary: 'working out what words mean',
  literal: 'finding details in the text',
  inferential: 'reading between the lines',
};

export function standardChildMessage(f: NotesFacts): string {
  if (f.levelAfter > f.levelBefore) {
    return 'You moved up a level! Your careful reading is paying off.';
  }
  if (f.levelAfter < f.levelBefore) {
    return 'Your next stories will feel a little lighter. Take your time and enjoy them.';
  }
  if (f.passed) return 'Great reading! You found the answers in the story.';
  return 'Thank you for reading today. Every story helps you grow as a reader.';
}

export function standardWhatHappened(f: NotesFacts): string {
  const parts = [`Answered ${f.correct} of ${f.total} questions correctly.`];
  if (f.wordsRight != null && f.wordsTotal != null) {
    parts.push(`Read ${f.wordsRight} of ${f.wordsTotal} words right on the counted try.`);
  }
  if (f.levelAfter > f.levelBefore) parts.push(`Moved up to level ${f.levelAfter}.`);
  else if (f.levelAfter < f.levelBefore) {
    parts.push(`Moved to level ${f.levelAfter} for more practice at an easier step.`);
  } else parts.push(`Stays at level ${f.levelAfter}.`);
  return parts.join(' ');
}

export function standardWhyFocus(f: NotesFacts): string {
  if (!f.focus) {
    return 'There is not enough evidence yet to pick a focus skill, so the next stories keep a balanced mix of questions.';
  }
  return `The next stories add extra questions on ${SKILL_WORDS[f.focus]}, because it is the skill with the most room to grow so far.`;
}
