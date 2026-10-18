import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ParentShell } from '@/components/shell/ParentShell';
import { getSessionUser } from '@/server/session';

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user?.role !== 'parent') redirect('/sign-in');
  return <ParentShell>{children}</ParentShell>;
}
