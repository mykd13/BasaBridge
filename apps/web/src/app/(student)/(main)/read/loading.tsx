import { Spinner } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { LinkButton } from '@/components/student/common';

/** Canvas B1: shown while the server gets the story ready. It shows no made-up progress. */
export default function Loading() {
  const t = useTranslations('student');
  return (
    <div className="bb-s-page bb-s-page--narrow bb-s-page--center" aria-busy="true">
      <Spinner label={t('read.makingTitle')} />
      <h1 className="bb-s-title">{t('read.makingTitle')}</h1>
      <p className="bb-s-lead">{t('read.makingBody')}</p>
      <LinkButton href="/home" variant="secondary">
        {t('read.cancel')}
      </LinkButton>
    </div>
  );
}
