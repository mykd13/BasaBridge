import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Logo } from './Logo';
import './shell.css';

/** The parts both shells share: skip link, header, a nav slot and the main landmark. */
export function ShellFrame({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const t = useTranslations();
  return (
    <div className="bb-shell">
      <a className="bb-skip" href="#main">
        {t('skip.toContent')}
      </a>
      <header className="bb-shell__header">
        <Logo />
        <nav className="bb-nav" aria-label={t('nav.main')}>
          {nav}
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="bb-shell__main">
        {children}
      </main>
    </div>
  );
}
