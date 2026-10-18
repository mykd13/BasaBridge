import { StudentEmpty } from '@/components/student/common';
import { ReadSession } from '@/components/student/ReadSession';
import { TriesUsedScreen } from '@/components/student/ReadingResults';
import { titleFor } from '@/components/student/title';
import { student } from '@/server/student/data';
import { requireLearner } from '@/server/student/learner';

export const generateMetadata = () => titleFor('read.pageTitle');

/**
 * Reading session (canvas B2, B3, D2, D3). The server picks the story and the try, and says
 * whether the microphone may be used. `from` is set after stopping early.
 */
export default async function ReadPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const mode = from === 'rest' || from === 'top' ? from : undefined;
  const reading = await student.reading(await requireLearner(), mode);
  if (!reading.ok) return <StudentEmpty reason={reading.reason} />;
  if (reading.data.status === 'tries_used') return <TriesUsedScreen reading={reading.data} />;
  return <ReadSession key={reading.data.sessionId} reading={reading.data} />;
}
