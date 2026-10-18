import { LogOut } from '@basabridge/ui/icons';
import { signOut } from '@/server/actions/sign-out';
import { useTranslations } from 'next-intl';

/** Sign out is a form, so it works without script and a link cannot trigger it by accident. */
export function SignOutForm() {
  const t = useTranslations();
  return (
    <form action={signOut}>
      <button type="submit" className="bb-nav__item bb-nav__item--quiet">
        <span className="bb-nav__icon" aria-hidden="true">
          <LogOut size={20} />
        </span>
        {t('nav.signOut')}
      </button>
    </form>
  );
}
