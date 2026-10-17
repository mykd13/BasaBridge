import { BookOpen, House, Star, User } from '@basabridge/ui/icons';
import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { NavLink } from './NavLink';
import { ShellFrame } from './ShellFrame';
import { SignOutForm } from './SignOutForm';

/** Header and menu for a signed-in learner (canvas A3): Home, Learn, My progress, My account, Sign out. */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <ShellFrame
      nav={
        <>
          <NavLink href="/home" icon={<House size={20} />}>
            {t('nav.home')}
          </NavLink>
          <NavLink href="/learn" icon={<BookOpen size={20} />}>
            {t('nav.learn')}
          </NavLink>
          <NavLink href="/progress" icon={<Star size={20} />}>
            {t('nav.progress')}
          </NavLink>
          <NavLink href="/account" icon={<User size={20} />}>
            {t('nav.account')}
          </NavLink>
          <SignOutForm />
        </>
      }
    >
      {children}
    </ShellFrame>
  );
}
