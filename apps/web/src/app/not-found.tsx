import { ButtonLink } from '@basabridge/ui';
import '@/components/shell/shell.css';
import { TriangleAlert } from '@basabridge/ui/icons';
import { EmptyState } from '@/components/states/EmptyState';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations();
  return (
    <main className="bb-shell__main">
      <EmptyState
        headingLevel={1}
        icon={<TriangleAlert size={32} />}
        title={t('errors.notFound.title')}
        body={t('errors.notFound.body')}
        action={
          <ButtonLink href="/sign-in" size="md">
            {t('errors.notFound.action')}
          </ButtonLink>
        }
      />
    </main>
  );
}
