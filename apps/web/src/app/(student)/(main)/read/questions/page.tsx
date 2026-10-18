import { redirect } from 'next/navigation';
import { StudentEmpty } from '@/components/student/common';
import { QuestionFlow } from '@/components/student/QuestionFlow';
import { titleFor } from '@/components/student/title';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

export const generateMetadata = () => titleFor('questions.pageTitle');

/** Canvas C1 and C2. The page never loads the story: the story is hidden during questions. */
export default async function Page() {
  const question = await student.question(await requireLearner());
  if (!question.ok) return <StudentEmpty reason={question.reason} />;
  if (question.data.status === 'complete') redirect('/read/result');
  return <QuestionFlow key={question.data.questionId} question={question.data} />;
}
