import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ParentShell } from '@/components/shell/ParentShell';
import { requireCurrentConsent } from '@/server/consent';
import { getSessionUser } from '@/server/session';

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user?.role !== 'parent') redirect('/sign-in');
  await requireCurrentConsent();
  return <ParentShell>{children}</ParentShell>;
}
