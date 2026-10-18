/**
 * Comprehension tags on generated questions (ADR 0003, BB-43).
 * A tagged question says which sub-skill it tests and why each wrong option is wrong.
 * The rules that tags must agree with the question live in `checks.ts` (`checkStory` with
 * `requireTags`), so there is one place that decides.
 */
import { QuestionTags, StoryQuestion } from '@basabridge/contracts';
import type { z } from 'zod';

/** A multiple-choice question with its sub-skill and distractor types. Required for new stories. */
export const TaggedQuestion = StoryQuestion.extend(QuestionTags.shape);
export type TaggedQuestion = z.infer<typeof TaggedQuestion>;
