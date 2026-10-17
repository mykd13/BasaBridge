import { Spinner } from '@basabridge/ui';
import { t } from '@/i18n';
import './states.css';

/** What a route shows while it loads on a slow connection. The shell stays on screen around it. */
export function PageLoading() {
  return (
    <div className="bb-state-loading" aria-busy="true">
      <Spinner label={t('loading.page')} />
    </div>
  );
}
