'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from './Logo';
import './shell.css';

/**
 * The header on sign in (A1) and create an account (A2): the logo and a link to the other one.
 * The legal pages (BB-69) use it too, and a signed-in person reads them from the footer, so the
 * link to the other account page shows only on sign in and sign up.
 */
export function SignedOutHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const onSignUp = pathname === '/sign-up';
  const onAccountPage = onSignUp || pathname === '/sign-in';
  return (
    <header className="bb-shell__header">
      <Logo />
      {onAccountPage ? (
        <Link className="bb-shell__switch" href={onSignUp ? '/sign-in' : '/sign-up'}>
          {onSignUp ? t('header.haveAccount') : t('header.newHere')}
        </Link>
      ) : null}
      <LanguageSwitch />
    </header>
  );
}
