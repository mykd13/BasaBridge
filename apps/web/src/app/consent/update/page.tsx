import { Info } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/states/EmptyState';
import { LegalLinks } from '@/components/legal/LegalLinks';
import '@/components/shell/shell.css';

/**
 * Where `requireCurrentConsent` sends a signed-in user whose agreement is out of date (BB-69).
 * It points to the documents. Recording the new agreement is BB-11, so there is no button yet.
 */
export default function Page() {
  const t = useTranslations('legal.update');
  return (
    <main id="main" tabIndex={-1} className="bb-shell__main">
      <EmptyState
        headingLevel={1}
        icon={<Info size={32} />}
        title={t('title')}
        body={t('body')}
        action={
          <>
            <LegalLinks />
            <p className="bb-state__body">{t('later')}</p>
          </>
        }
      />
    </main>
  );
}
