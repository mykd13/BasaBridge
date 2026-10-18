import { ButtonLink } from '@basabridge/ui';
import { useTranslations } from 'next-intl';
import { AccountPage } from '@/components/account/AccountPage';
import { SignUpForm } from '@/components/account/SignUpForm';
import { redirectIfSignedIn } from '@/server/redirect';

function SignUp({ role }: { role: 'student' | 'parent' }) {
  const t = useTranslations();
  const parent = role === 'parent';
  return (
    <AccountPage>
      <h1>{parent ? t('account.signUp.parentTitle') : t('account.signUp.title')}</h1>
      <p className="bb-account__muted">
        {parent ? t('account.signUp.parentIntro') : t('account.signUp.intro')}
      </p>
      <SignUpForm role={role} />
      <ButtonLink href={parent ? '/sign-up' : '/sign-up?as=parent'} variant="ghost" block>
        {parent ? t('account.signUp.studentSwitch') : t('account.signUp.parentSwitch')}
      </ButtonLink>
    </AccountPage>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  await redirectIfSignedIn();
  const { as } = await searchParams;
  return <SignUp role={as === 'parent' ? 'parent' : 'student'} />;
}
