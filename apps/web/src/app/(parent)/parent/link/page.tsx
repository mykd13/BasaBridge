import { Card } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { AccountPage } from '@/components/account/AccountPage';
import { LinkChildForm } from '@/components/account/LinkChildForm';

/** Link a child (F1). A parent types the code the child made. */
export default function Page() {
  const t = useTranslations();
  return (
    <AccountPage>
      <h1>{t('account.parentLink.title')}</h1>
      <p>{t('account.parentLink.intro')}</p>
      <LinkChildForm />
      <Card>
        <h2>{t('account.parentLink.seeTitle')}</h2>
        <ul className="bb-account__list">
          <li>{t('account.parentLink.see1')}</li>
          <li>{t('account.parentLink.see2')}</li>
          <li>{t('account.parentLink.see3')}</li>
        </ul>
        <p className="bb-account__muted">{t('account.parentLink.noVoice')}</p>
      </Card>
    </AccountPage>
  );
}
