'use client';

import { LogOut } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import { signOutAndReload } from '@/lib/sign-out-client';
import { endSession, signOut } from '@/server/actions/sign-out';

/**
 * Sign out is a form, so it works without script and a link cannot trigger it by accident.
 * With script it also clears this tab's `bb:` session keys and does a full page load, so the
 * next learner on a shared device sees nothing from the last one (BB-71).
 */
export function SignOutForm() {
  const t = useTranslations();
  return (
    <form
      action={signOut}
      onSubmit={(event) => {
        event.preventDefault();
        void signOutAndReload(endSession);
      }}
    >
      <button type="submit" className="bb-nav__item bb-nav__item--quiet">
        <span className="bb-nav__icon" aria-hidden="true">
          <LogOut size={20} />
        </span>
        {t('nav.signOut')}
      </button>
    </form>
  );
}
