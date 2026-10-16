import type { ComprehensionSkill } from '@basabridge/contracts';
import type { Tier } from '@basabridge/levels';

/**
 * Everything the story model may see. It is a closed list on purpose: levels, tier numbers, a
 * topic, a skill mix and recent titles. No names, usernames, emails or audio (golden rule 2).
 * Model-facing change: keep this list short and review additions with James.
 */
export interface StoryPromptInput {
  level: number;
  tier: Pick<Tier, 'words' | 'maxReadingGrade' | 'description'>;
  topic: string;
  mix: ComprehensionSkill[];
  recentTitles: string[];
  /** Why the last try failed. Lets BB-17 plug in a retry. */
  retryReason?: string;
}

const SKILL_RULE: Record<ComprehensionSkill, string> = {
  vocabulary:
    'a vocabulary question about one word from the passage. Set "word" to that word. The word must appear in the passage exactly as written',
  literal: 'a literal question whose answer is stated in the passage. Set "word" to null',
  inferential:
    'an inferential question whose answer follows from clues in the passage but is not stated. Set "word" to null',
};

/**
 * Builds the system and user text from named fields only. It never spreads or stringifies the
 * input object, so an extra field cannot reach the model.
 */
export function buildStoryPrompt(input: StoryPromptInput): { system: string; prompt: string } {
  const { level, tier, topic, mix, recentTitles, retryReason } = input;

  const questionLines = mix.map((skill, i) => `${i + 1}. ${SKILL_RULE[skill]}.`);

  const system = [
    'You write short English reading passages and comprehension questions for children learning to read.',
    'Reply with JSON only, in the shape you are given.',
    '',
    'Passage rules:',
    `- Length: between ${tier.words.min} and ${tier.words.max} words.`,
    `- Reading level: Flesch-Kincaid grade ${tier.maxReadingGrade} or lower. Use short sentences and common words.`,
    `- Style: ${tier.description}.`,
    '- Content must be safe for children: no violence, fear, romance, politics, religion, brands or real people.',
    '- Invent simple first names for the characters. Never use any other name.',
    '- Give the story a short, original title.',
    '',
    `Questions: write exactly ${mix.length}, in this order.`,
    ...questionLines,
    '',
    'Question rules:',
    '- Each question has exactly four options that are different from each other.',
    '- Exactly one option is correct. Set "answerIndex" to its position, from 0 to 3.',
    '- Set "evidence" to one sentence copied word for word from the passage that supports the answer.',
    '- Set "skill" to vocabulary, literal or inferential to match the question.',
  ].join('\n');

  const lines = [
    `Write a story for reading level ${level}.`,
    `Topic: ${topic}.`,
    recentTitles.length > 0
      ? `Do not use any of these titles: ${recentTitles.map((t) => `"${t}"`).join(', ')}.`
      : 'There are no recent titles to avoid.',
  ];
  if (retryReason) lines.push(`The last attempt failed this check: ${retryReason} Fix that.`);

  return { system, prompt: lines.join('\n') };
}
