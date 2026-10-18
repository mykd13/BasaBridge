import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import './account.css';

/** The centred column shared by the account screens. `wide` puts the intro beside the form. */
export function AccountPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={wide ? 'bb-account bb-account--wide' : 'bb-account'}>{children}</div>;
}

/** The welcome block on sign in (A1). */
export function AccountHero() {
  const t = useTranslations();
  return (
    <section className="bb-account__hero" aria-labelledby="bb-hero-title">
      <h2 id="bb-hero-title">{t('account.signIn.heroTitle')}</h2>
      <p>{t('account.signIn.heroBody')}</p>
      <ul>
        <li>{t('account.signIn.point1')}</li>
        <li>{t('account.signIn.point2')}</li>
        <li>{t('account.signIn.point3')}</li>
      </ul>
    </section>
  );
}
