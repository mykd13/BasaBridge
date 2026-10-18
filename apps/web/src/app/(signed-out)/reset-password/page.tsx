import { ButtonLink, Notice } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { AccountPage } from '@/components/account/AccountPage';
import { ResetPasswordForm, ResetRequestForm } from '@/components/account/ResetForms';

function Reset({ token, bad }: { token?: string; bad: boolean }) {
  const t = useTranslations();
  return (
    <AccountPage>
      <h1>{token ? t('account.reset.newTitle') : t('account.reset.title')}</h1>
      {bad ? (
        <Notice tone="bad" live="assertive">
          <p>{t('account.reset.badLink')}</p>
        </Notice>
      ) : null}
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <p className="bb-account__muted">{t('account.reset.intro')}</p>
          <ResetRequestForm />
          <Notice tone="accent">
            <p>{t('account.reset.noEmail')}</p>
          </Notice>
        </>
      )}
      <ButtonLink href="/sign-in" variant="ghost" block>
        {t('account.reset.back')}
      </ButtonLink>
    </AccountPage>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return <Reset token={error ? undefined : token} bad={Boolean(error)} />;
}
