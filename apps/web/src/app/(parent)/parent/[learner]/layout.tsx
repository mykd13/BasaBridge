import type { ReactNode } from 'react';
import { SectionNav } from '@/components/parent/SectionNav';

export default async function LearnerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ learner: string }>;
}) {
  const { learner } = await params;
  return (
    <>
      <SectionNav learner={learner} />
      {children}
    </>
  );
}
