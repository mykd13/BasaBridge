import { Users } from '@basabridge/ui/icons';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { NavLink } from './NavLink';
import { ShellFrame } from './ShellFrame';
import { SignOutForm } from './SignOutForm';

/** Header and menu for a linked parent (canvas P1): Parent account and Sign out only. */
export function ParentShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  return (
    <ShellFrame
      nav={
        <>
          <NavLink href="/parent" icon={<Users size={20} />}>
            {t('nav.parentAccount')}
          </NavLink>
          <SignOutForm />
        </>
      }
    >
      {children}
    </ShellFrame>
  );
}
