import { BookOpen } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import type { en } from '@/i18n/catalog/en';
import { EmptyState } from './EmptyState';

export type ScreenKey = keyof (typeof en)['screens'];

/**
 * The page body for a screen that is on the canvas but not built yet.
 * `boards` names the canvas boards it will follow, for example "A1".
 * No sample data: it says the screen is not ready.
 */
export function ScreenPlaceholder({ screen, boards }: { screen: ScreenKey; boards: string }) {
  const t = useTranslations();
  return (
    <EmptyState
      headingLevel={1}
      icon={<BookOpen size={32} />}
      title={t(`screens.${screen}`)}
      body={t('placeholder.body')}
      action={<p className="bb-state__body">{t('placeholder.board', { boards })}</p>}
    />
  );
}
