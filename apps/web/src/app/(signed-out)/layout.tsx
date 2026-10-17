import type { ReactNode } from 'react';
import { SignedOutHeader } from '@/components/shell/SignedOutHeader';
import { t } from '@/i18n';

export default function SignedOutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="bb-skip" href="#main">
        {t('skip.toContent')}
      </a>
      <SignedOutHeader />
      <main id="main" tabIndex={-1} className="bb-shell__main">
        {children}
      </main>
    </>
  );
}
