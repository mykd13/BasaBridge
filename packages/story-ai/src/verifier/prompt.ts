import type { StoryQuestion } from '@basabridge/contracts';

export const SAFETY_CATEGORIES = [
  'violence',
  'fear',
  'sexual',
  'hate',
  'religion',
  'politics',
  'brands',
  'personal_data',
] as const;
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

const CATEGORY_HELP: Record<SafetyCategory, string> = {
  violence: 'people or animals being hurt, fighting, weapons or war',
  fear: 'scary scenes, danger, death, or anything likely to frighten a young child',
  sexual: 'romance, nudity or any sexual content',
  hate: 'insults, bullying, or unfair treatment of a group of people',
  religion: 'religious beliefs, practices or figures',
  politics: 'politicians, parties, elections or political opinions',
  brands: 'real company, product or brand names',
  personal_data: 'real full names, addresses, phone numbers, emails or other private details',
};

/**
 * Everything the verifier model may see: the passage and each question with its options. It is a
 * closed list on purpose. No answer index, evidence sentence or vocabulary word, and no names,
 * usernames or audio (golden rule 2). Model-facing change: review additions with James.
 */
export interface VerifierPromptInput {
  passage: string;
  questions: { question: string; options: string[] }[];
}

/** Copies only the question text and options, so a key or evidence sentence cannot leak. */
export function toVerifierInput(passage: string, questions: StoryQuestion[]): VerifierPromptInput {
  return {
    passage,
    questions: questions.map((q) => ({ question: q.question, options: [...q.options] })),
  };
}

/**
 * Builds the system and user text from named fields only. It never spreads or stringifies the
 * input object, so an extra field cannot reach the model.
 */
export function buildVerifierPrompt(input: VerifierPromptInput): {
  system: string;
  prompt: string;
} {
  const { passage, questions } = input;

  const system = [
    'You are checking a reading passage written for children learning to read English.',
    'Answer each question using the passage alone. Pick the one best option.',
    'Then judge whether the passage is safe for children. Name every category that applies:',
    ...SAFETY_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_HELP[c]}.`),
    'Set "safe" to false if any category applies. Otherwise set it to true and leave "categories" empty.',
    'Keep "reason" to one short sentence. Do not copy text from the passage into it.',
    '',
    'Reply with JSON only, in this shape:',
    '{"answers":[{"question":1,"answerIndex":0}],"safety":{"safe":true,"categories":[],"reason":""}}',
    '"question" is the question number, starting at 1. "answerIndex" is the option number, from 0 to 3.',
  ].join('\n');

  const questionBlocks = questions.map((q, i) =>
    [`Question ${i + 1}: ${q.question}`, ...q.options.map((o, j) => `  ${j}. ${o}`)].join('\n'),
  );

  const prompt = ['Passage:', passage, '', ...questionBlocks.flatMap((b) => [b, ''])]
    .join('\n')
    .trimEnd();

  return { system, prompt };
}
