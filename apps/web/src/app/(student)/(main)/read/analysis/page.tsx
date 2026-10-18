import { StudentEmpty } from '@/components/student/common';
import { AnalysisScreen, StoppedEarlyScreen } from '@/components/student/ReadingResults';
import { titleFor } from '@/components/student/title';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

export const generateMetadata = () => titleFor('analysis.pageTitle');

/** Canvas B4 (analysis) and D1 (stopped early). */
export default async function Page() {
  const analysis = await student.analysis(await requireLearner());
  if (!analysis.ok) return <StudentEmpty reason={analysis.reason} />;
  return analysis.data.completed ? (
    <AnalysisScreen analysis={analysis.data} />
  ) : (
    <StoppedEarlyScreen analysis={analysis.data} />
  );
}
