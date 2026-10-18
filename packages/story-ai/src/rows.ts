/**
 * Turns checked, verified questions into rows for the questions table (packages/db).
 * Every new question carries its sub-skill and distractor types (ADR 0003, BB-43).
 * The keys match the table's insert type, so the story bank (BB-18) passes these to insertQuestions.
 */
import type { DistractorType, QuestionType, SubSkill } from '@basabridge/contracts';
import type { TaggedQuestion } from './tags';

export interface QuestionRow {
  storyId: string;
  skill: TaggedQuestion['skill'];
  word: string | null;
  text: string;
  options: string[];
  answerIndex: number;
  evidence: string;
  subskill: SubSkill;
  type: QuestionType;
  distractors: (DistractorType | null)[];
}

export function toQuestionRows(storyId: string, questions: TaggedQuestion[]): QuestionRow[] {
  return questions.map((q) => ({
    storyId,
    skill: q.skill,
    word: q.word,
    text: q.question,
    options: q.options,
    answerIndex: q.answerIndex,
    evidence: q.evidence,
    subskill: q.subskill,
    type: 'multiple_choice',
    distractors: q.distractors,
  }));
}
