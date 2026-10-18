import type { ReactNode } from 'react';
import { LegalLinks } from '@/components/legal/LegalLinks';
import { SignedOutHeader } from '@/components/shell/SignedOutHeader';
import { useTranslations } from 'next-intl';

export default function SignedOutLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
  return (
    <>
      <a className="bb-skip" href="#main">
        {t('skip.toContent')}
      </a>
      <SignedOutHeader />
      <main id="main" tabIndex={-1} className="bb-shell__main">
        {children}
      </main>
      <footer>
        <LegalLinks />
      </footer>
    </>
  );
}
