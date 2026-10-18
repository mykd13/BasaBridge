'use client';

import { isNotWired } from '@/server/errors';
import { useTranslations } from 'next-intl';
import { ErrorState } from './ErrorState';

/** The body of every route error boundary. Next passes `error` and `reset` to error.tsx. */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  if (isNotWired(error)) {
    return (
      <ErrorState tone="warn" title={t('errors.notWired.title')} body={t('errors.notWired.body')} />
    );
  }
  return (
    <ErrorState
      title={t('errors.generic.title')}
      body={t('errors.generic.body')}
      retry={{ label: t('errors.retry'), onClick: reset }}
    />
  );
}
