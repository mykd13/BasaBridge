'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Logo } from './Logo';
import './shell.css';

/** The header on sign in (A1) and create an account (A2): the logo and a link to the other one. */
export function SignedOutHeader() {
  const t = useTranslations();
  const onSignUp = usePathname() === '/sign-up';
  return (
    <header className="bb-shell__header">
      <Logo />
      <Link className="bb-shell__switch" href={onSignUp ? '/sign-in' : '/sign-up'}>
        {onSignUp ? t('header.haveAccount') : t('header.newHere')}
      </Link>
      <LanguageSwitch />
    </header>
  );
}
