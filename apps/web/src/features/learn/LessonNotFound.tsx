import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClassName } from '@basabridge/ui';

export function LessonNotFound() {
  const t = useTranslations();
  return (
    <main className="bb-learn">
      <p>{t('learn.notFound')}</p>
      <Link className={buttonClassName({ variant: 'primary', size: 'lg' })} href="/learn">
        {t('learn.backToLearn')}
      </Link>
    </main>
  );
}
