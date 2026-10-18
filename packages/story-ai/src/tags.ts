/**
 * Comprehension tags on generated questions (ADR 0003, BB-43).
 * A tagged question says which sub-skill it tests and why each wrong option is wrong.
 * The rules that tags must agree with the question live in `checks.ts` (`checkStory` with
 * `requireTags`), so there is one place that decides.
 */
import { QuestionTags, Story, StoryQuestion } from '@basabridge/contracts';
import { z } from 'zod';
import { MIN_QUESTIONS } from './checks';

/** A multiple-choice question with its sub-skill and distractor types. Required for new stories. */
export const TaggedQuestion = StoryQuestion.extend(QuestionTags.shape);
export type TaggedQuestion = z.infer<typeof TaggedQuestion>;

/**
 * A generated story whose questions keep their tags. The contracts `Story` schema strips unknown
 * keys, so parsing a tagged story with it loses `subskill` and `distractors`. Story generation
 * returns this type until the contracts change lands (locked area: Rhett and Jhade).
 */
export const TaggedStory = Story.extend({
  questions: z.array(TaggedQuestion).min(MIN_QUESTIONS),
});
export type TaggedStory = z.infer<typeof TaggedStory>;

/**
 * Joins the `questions` and `tags` of a passing `checkStory` result, same order. Every new question
 * must have tags, so a missing entry throws instead of returning an untagged question.
 */
export function tagQuestions(
  questions: StoryQuestion[],
  tags: (QuestionTags | null)[],
): TaggedQuestion[] {
  if (tags.length !== questions.length) {
    throw new Error(`Got ${tags.length} tag entries for ${questions.length} questions.`);
  }
  return questions.map((q, i) => {
    const t = tags[i];
    if (!t) throw new Error(`Question ${i + 1} has no tags.`);
    return { ...q, subskill: t.subskill, distractors: t.distractors };
  });
}
