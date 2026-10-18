/**
 * Comprehension tags on generated questions (ADR 0003, BB-43).
 * A tagged question says which sub-skill it tests and why each wrong option is wrong.
 */
import { QuestionTags, StoryQuestion, SUBSKILL_PARENT } from '@basabridge/contracts';
import type { z } from 'zod';

/** A multiple-choice question with its sub-skill and distractor types. Required for new stories. */
export const TaggedQuestion = StoryQuestion.extend(QuestionTags.shape);
export type TaggedQuestion = z.infer<typeof TaggedQuestion>;

const normalise = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

/**
 * Checks that the tags agree with the question. Returns the reason for the first problem, or null.
 * The shape itself (nine sub-skills, six distractor types, four entries) is checked by the schema.
 */
export function tagProblem(q: TaggedQuestion): string | null {
  if (SUBSKILL_PARENT[q.subskill] !== q.skill) {
    return `Sub-skill ${q.subskill} does not belong to skill ${q.skill}.`;
  }
  for (let i = 0; i < 4; i++) {
    const label = q.distractors[i];
    if (i === q.answerIndex && label !== null) {
      return 'The correct option must have no distractor type.';
    }
    if (i !== q.answerIndex && label === null) {
      return `Wrong option ${i} has no distractor type.`;
    }
  }
  if (q.skill === 'vocabulary') {
    if (!q.word || q.word.trim() === '') return 'A vocabulary question needs a word.';
    if (!normalise(q.question).includes(normalise(q.word))) {
      return 'A vocabulary question must name its word.';
    }
  }
  return null;
}
