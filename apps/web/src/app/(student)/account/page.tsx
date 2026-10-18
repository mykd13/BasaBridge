import { ButtonLink, Card, Notice } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { AccountPage } from '@/components/account/AccountPage';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { getCurrentUser } from '@/server/auth';

interface Props {
  username: string | null;
  email: string | null;
}

function MyAccount({ username, email }: Props) {
  const t = useTranslations();
  return (
    <AccountPage>
      <h1>{t('account.myAccount.title')}</h1>
      <Card>
        <dl>
          <dt>{t('account.myAccount.username')}</dt>
          <dd translate="no">{username}</dd>
          <dd className="bb-account__muted">{t('account.myAccount.usernameFixed')}</dd>
        </dl>
        <dl>
          <dt>{t('account.myAccount.email')}</dt>
          {email ? (
            <dd translate="no">{email}</dd>
          ) : (
            <dd>
              <Notice tone="warn">
                <p>{t('account.myAccount.noEmail')}</p>
              </Notice>
            </dd>
          )}
        </dl>
      </Card>
      <Card>
        <h2>{t('account.myAccount.passwordTitle')}</h2>
        <ChangePasswordForm />
      </Card>
      <Card>
        <h2>{t('account.myAccount.voiceTitle')}</h2>
        <p>{t('account.myAccount.voiceBody')}</p>
        <p className="bb-account__muted">{t('account.myAccount.notReady')}</p>
      </Card>
      <Card>
        <h2>{t('account.myAccount.shareTitle')}</h2>
        <p>{t('account.myAccount.shareBody')}</p>
        <div className="bb-account__row">
          <ButtonLink href="/account/share" variant="secondary">
            {t('account.myAccount.shareLink')}
          </ButtonLink>
          <ButtonLink href="/account/help" variant="secondary">
            {t('account.myAccount.helpLink')}
          </ButtonLink>
        </div>
      </Card>
    </AccountPage>
  );
}

/** My account (E2). Reads the signed in user from the session, nothing else. */
export default async function Page() {
  const user = await getCurrentUser().catch(() => null);
  return <MyAccount username={user?.username ?? null} email={user?.email ?? null} />;
}
