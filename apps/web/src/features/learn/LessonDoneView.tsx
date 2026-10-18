import { Check } from '@basabridge/ui/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClassName, Notice } from '@basabridge/ui';
import { SpeakText } from './SpeakText';

/** H5. It says the check comes in the next story, and that practice does not change the level. */
export function LessonDoneView({
  title,
  recheckItems,
  returnTo,
}: {
  title: string;
  recheckItems: number;
  returnTo: string | null;
}) {
  const t = useTranslations();
  return (
    <div className="bb-learn bb-done">
      <span className="bb-done__tick" role="img" aria-label={t('learn.done.icon')}>
        <Check size={44} strokeWidth={4.5} aria-hidden="true" />
      </span>
      <div className="bb-learn__head">
        <h1>{t('learn.done.title', { title })}</h1>
        <SpeakText
          text={t('learn.done.title', { title })}
          label={t('learn.done.listen')}
          size="lg"
        />
      </div>
      <p className="bb-done__next">{t('learn.done.next', { count: recheckItems })}</p>
      <Notice tone="accent">
        <p>{t('learn.done.badge', { count: recheckItems })}</p>
      </Notice>
      <div className="bb-learn__actions">
        <Link className={buttonClassName({ variant: 'primary', size: 'lg' })} href="/read">
          {t('learn.result.readNew')}
        </Link>
        <Link className={buttonClassName({ variant: 'secondary', size: 'lg' })} href="/learn">
          {t('learn.backToLearn')}
        </Link>
        {returnTo && returnTo !== '/learn' ? (
          <Link className="bb-learn__leave" href={returnTo}>
            {t('learn.leave')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
