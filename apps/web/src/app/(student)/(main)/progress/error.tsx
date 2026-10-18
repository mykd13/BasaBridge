'use client';

import { useTranslations } from 'next-intl';
import { RouteError } from '@/components/states/RouteError';
import styles from './progress.module.css';

/** Keeps the page's one h1 when the loader fails or is not wired yet. */
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('screens.progress')}</h1>
      <RouteError {...props} />
    </div>
  );
}
