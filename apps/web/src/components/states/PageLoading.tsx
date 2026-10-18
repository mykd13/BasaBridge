import { Spinner } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import './states.css';

/** What a route shows while it loads on a slow connection. The shell stays on screen around it. */
export function PageLoading() {
  const t = useTranslations();
  return (
    <div className="bb-state-loading" aria-busy="true">
      <Spinner label={t('loading.page')} />
    </div>
  );
}
