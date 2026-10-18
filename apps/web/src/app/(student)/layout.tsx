import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ReadingHelpBoot } from '@/components/reading-help/ReadingHelpBoot';
import { ReadingHelpProvider } from '@/components/reading-help/ReadingHelpProvider';
import { StudentShell } from '@/components/shell/StudentShell';
import { requireCurrentConsent } from '@/server/consent';
import { getSessionUser } from '@/server/session';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user?.role !== 'student') redirect('/sign-in');
  await requireCurrentConsent();
  return (
    <ReadingHelpProvider learnerId={user.id}>
      <ReadingHelpBoot learnerId={user.id} />
      <StudentShell>{children}</StudentShell>
    </ReadingHelpProvider>
  );
}
