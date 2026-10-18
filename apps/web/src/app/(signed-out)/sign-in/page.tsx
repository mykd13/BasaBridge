import { redirectIfSignedIn } from '@/server/redirect';
import { SignInForm } from '@/components/account/SignInForm';
import { AccountHero, AccountPage } from '@/components/account/AccountPage';
import { useTranslations } from 'next-intl';
import { ButtonLink, Notice } from '@basabridge/ui';

function SignIn() {
  const t = useTranslations();
  return (
    <AccountPage wide>
      <AccountHero />
      <div className="bb-account__panel">
        <h1>{t('account.signIn.title')}</h1>
        <SignInForm />
        <ButtonLink href="/sign-up" variant="secondary" block>
          {t('account.signIn.create')}
        </ButtonLink>
        <Notice tone="accent">
          <p>{t('account.signIn.parentNote')}</p>
        </Notice>
      </div>
    </AccountPage>
  );
}

export default async function Page() {
  await redirectIfSignedIn();
  return <SignIn />;
}
