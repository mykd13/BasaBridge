/**
 * The story generation prompt (docs/PLAN.md section 7, ADR 0003). Owner: Jhade (BB-15, BB-43).
 * Privacy: the prompt carries the level, the focus skill, recent titles and a topic seed only.
 * No names, usernames, audio or other learner data. buildStoryPrompt reads only those fields.
 */
import type { ComprehensionSkill, DistractorType, SubSkill } from '@basabridge/contracts';
import { SUBSKILL_PARENT } from '@basabridge/contracts';
import { tierFor } from '@basabridge/levels';

/** What each sub-skill tests, in the words the model sees. */
export const SUBSKILL_MEANING: Record<SubSkill, string> = {
  word_in_context: 'what a word from the passage means, worked out from the sentence around it',
  word_parts: 'what a word means from its parts (root, prefix, suffix)',
  key_detail: 'a fact stated directly in the passage',
  sequence: 'the order in which things happened',
  main_idea: 'what the whole passage is mostly about',
  cause_effect:
    'why something happened or what it led to, when the passage does not say it outright',
  feelings: 'how a character feels or why, from clues in the passage',
  prediction: 'what will most likely happen next, from clues in the passage',
  conclusion: 'a fact that is not stated but must be true from the passage',
};

/** Why a wrong option is wrong, in the words the model sees. */
export const DISTRACTOR_MEANING: Record<DistractorType, string> = {
  wrong_detail: 'uses a real detail from the passage, but not the one that answers the question',
  opposite: 'says the opposite of what the passage says',
  not_stated: 'sounds possible but the passage never says or implies it',
  partly_right: 'is true in part but leaves out or changes an important piece',
  unrelated: 'has nothing to do with the passage',
  word_sense: 'is a real meaning of the word, but not the meaning used in this passage',
};

export interface StoryPromptInput {
  level: number;
  /** Extra questions on this skill, chosen by code from the mastery estimates. */
  focus: ComprehensionSkill | null;
  /** Titles to avoid repeating. */
  recentTitles: string[];
  /** A topic to write about, from the topic list. */
  topicSeed?: string;
}

const list = (meanings: Record<string, string>, parent?: Record<string, string>) =>
  Object.entries(meanings)
    .map(([k, v]) => `- ${k}${parent ? ` (skill: ${parent[k]})` : ''}: ${v}`)
    .join('\n');

export function buildStoryPrompt(input: StoryPromptInput): string {
  const { level, focus, recentTitles, topicSeed } = input;
  const tier = tierFor(level);
  const lines = [
    `Write a short English story for a child reading at level ${level} of 100.`,
    `Length: ${tier.words.min} to ${tier.words.max} words. Style: ${tier.description}.`,
    `Keep the Flesch-Kincaid reading grade at or below ${tier.maxReadingGrade}.`,
    'Use a Philippine-relevant, everyday setting. Avoid stereotypes.',
    topicSeed ? `Topic: ${topicSeed}.` : '',
    recentTitles.length ? `Do not reuse these titles: ${recentTitles.join('; ')}.` : '',
    '',
    'Then write five multiple-choice questions about the story.',
    focus ? `At least two questions must test the skill "${focus}".` : '',
    'Each question has exactly four different options and one correct answer.',
    'Each question has an "evidence" sentence copied word for word from the story.',
    '',
    'Tag every question with one sub-skill. Its "skill" must be the skill shown in brackets:',
    list(SUBSKILL_MEANING, SUBSKILL_PARENT),
    'A vocabulary question gives the word in "word" and names that word in the question.',
    '',
    'Give "distractors": one entry per option, in option order.',
    'Use null for the correct option. For each wrong option, give the type that says why it is wrong:',
    list(DISTRACTOR_MEANING),
    'Only use a type that is honestly true of that option.',
    '',
    'Reply with JSON only, in this shape:',
    '{"title": string, "text": string, "questions": [{"skill": string, "subskill": string, "word": string | null, "question": string, "options": [string, string, string, string], "answerIndex": 0 | 1 | 2 | 3, "distractors": [4 entries, null or a type], "evidence": string}]}',
  ];
  return lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}
