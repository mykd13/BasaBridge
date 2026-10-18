import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { StudentShell } from '@/components/shell/StudentShell';
import { getSessionUser } from '@/server/session';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (user?.role !== 'student') redirect('/sign-in');
  return <StudentShell>{children}</StudentShell>;
}
