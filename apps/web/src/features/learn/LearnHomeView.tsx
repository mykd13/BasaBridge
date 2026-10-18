import { BookOpen } from '@basabridge/ui/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClassName } from '@basabridge/ui';
import type { LearnHomeData } from '../../server/learn/port';
import { LessonCardView } from './LessonCardView';
import { SpeakText } from './SpeakText';
import { groupKeyFor } from './skill';

/** Groups the lessons under their skill heading, keeping the order the port gave. */
export function groupsOf(home: LearnHomeData) {
  const groups = new Map<
    ReturnType<typeof groupKeyFor>,
    LearnHomeData['bySkill'][number]['cards']
  >();
  for (const { subject, cards } of home.bySkill) {
    const key = groupKeyFor(subject);
    groups.set(key, [...(groups.get(key) ?? []), ...cards]);
  }
  return [...groups.entries()].map(([key, cards]) => ({ key, cards }));
}

export function LearnHomeView({ home }: { home: LearnHomeData }) {
  const t = useTranslations();
  const empty = home.bySkill.length === 0;
  return (
    <div className="bb-learn">
      <div className="bb-learn__head">
        <h1>{t('learn.title')}</h1>
        <SpeakText text={t('learn.title')} label={t('learn.listenPage')} />
      </div>
      {empty ? (
        <section className="bb-learn__empty">
          <p>{t('learn.empty')}</p>
          <Link className={buttonClassName({ variant: 'primary', size: 'lg' })} href="/read">
            <BookOpen size={24} aria-hidden="true" />
            {t('learn.emptyAction')}
          </Link>
        </section>
      ) : (
        <>
          {home.recommended.length > 0 ? (
            <section aria-labelledby="learn-recommended">
              <h2 id="learn-recommended">{t('learn.recommended')}</h2>
              <div className="bb-learn__grid">
                {home.recommended.map((card) => (
                  <LessonCardView key={card.lesson.id} card={card} />
                ))}
              </div>
            </section>
          ) : null}
          {groupsOf(home).map(({ key, cards }) => (
            <section key={key} aria-labelledby={`learn-group-${key}`}>
              <h2 id={`learn-group-${key}`}>{t(`learn.group.${key}`)}</h2>
              <div className="bb-learn__grid">
                {cards.map((card) => (
                  <LessonCardView key={card.lesson.id} card={card} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
