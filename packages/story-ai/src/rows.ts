/**
 * Turns checked, verified questions into rows for the questions table (packages/db).
 * Every new question carries its sub-skill and distractor types (ADR 0003, BB-43).
 * The keys match the table's insert type, so the story bank (BB-18) passes these to insertQuestions.
 */
import type {
  DistractorType,
  QuestionTags,
  QuestionType,
  StoryQuestion,
  SubSkill,
} from '@basabridge/contracts';

export interface QuestionRow {
  storyId: string;
  skill: StoryQuestion['skill'];
  word: string | null;
  text: string;
  options: string[];
  answerIndex: number;
  evidence: string;
  subskill: SubSkill;
  type: QuestionType;
  distractors: (DistractorType | null)[];
}

/**
 * `questions` and `tags` come from a passing `checkStory` result, same order. Every new question
 * must have tags, so a missing entry throws instead of storing an untagged row.
 */
export function toQuestionRows(
  storyId: string,
  questions: StoryQuestion[],
  tags: (QuestionTags | null)[],
): QuestionRow[] {
  return questions.map((q, i) => {
    const t = tags[i];
    if (!t) throw new Error(`Question ${i + 1} has no tags.`);
    return {
      storyId,
      skill: q.skill,
      word: q.word,
      text: q.question,
      options: q.options,
      answerIndex: q.answerIndex,
      evidence: q.evidence,
      subskill: t.subskill,
      type: 'multiple_choice' as const,
      distractors: t.distractors,
    };
  });
}
