import type { ReactNode } from 'react';
import { SignedOutHeader } from '@/components/shell/SignedOutHeader';

export default function SignedOutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedOutHeader />
      <main className="bb-shell__main">{children}</main>
    </>
  );
}
