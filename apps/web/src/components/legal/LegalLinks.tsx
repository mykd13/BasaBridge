import Link from 'next/link';
import { useTranslations } from 'next-intl';
import './legal.css';

/** Links to the privacy notice, the terms and the privacy summary for kids. Open to everyone. */
export function LegalLinks() {
  const t = useTranslations('legal');
  return (
    <nav className="bb-legal-links" aria-label={t('nav')}>
      <Link href="/privacy">{t('links.privacy')}</Link>
      <Link href="/terms">{t('links.terms')}</Link>
      <Link href="/privacy/kids">{t('links.kids')}</Link>
    </nav>
  );
}
