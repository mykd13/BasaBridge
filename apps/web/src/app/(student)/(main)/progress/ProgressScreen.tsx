import { Card, Chip, ButtonLink, LevelCard } from '@basabridge/ui';
import { BookOpen } from '@basabridge/ui/icons';
import { useFormatter, useTranslations } from 'next-intl';
import { EmptyState } from '@/components/states/EmptyState';
import type { ProgressView } from '@/server/progress/load-progress';
import styles from './progress.module.css';

const SHORT_DATE = { month: 'short', day: 'numeric' } as const;

/**
 * My progress (canvas E1). It formats what the loader returns and computes nothing:
 * levels, bars and the focus skill come from packages/mastery and packages/levels.
 * `null` means the learner has not finished a story yet.
 */
export function ProgressScreen({ view }: { view: ProgressView | null }) {
  const t = useTranslations();
  const format = useFormatter();

  if (!view) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t('screens.progress')}</h1>
        <EmptyState
          icon={<BookOpen size={32} />}
          title={t('progress.empty.title')}
          body={t('progress.empty.body')}
          action={
            <ButtonLink href="/home" size="md">
              {t('progress.empty.action')}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const { next, focusSkill, recent } = view;
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('screens.progress')}</h1>
      <div className={styles.grid}>
        <LevelCard
          eyebrow={t('progress.level')}
          level={view.level}
          suffix={t('progress.levelOf', { max: view.maxLevel })}
          progress={
            next
              ? {
                  value: next.progress,
                  label: t('progress.levelBar'),
                  valueText: t('progress.toNext', { count: next.storiesLeft, level: next.level }),
                }
              : undefined
          }
        >
          <p className={styles.muted}>
            {next
              ? t('progress.toNext', { count: next.storiesLeft, level: next.level })
              : t('progress.topLevel')}
          </p>
        </LevelCard>
        <Card aria-labelledby="progress-focus">
          <h2 id="progress-focus" className={styles.heading}>
            {t('progress.focus')}
          </h2>
          {focusSkill ? (
            <Chip tone="mark" size="lg" className={styles.focus}>
              {t(`progress.skills.${focusSkill}`)}
            </Chip>
          ) : (
            <p className={styles.muted}>{t('progress.focusNone')}</p>
          )}
        </Card>
      </div>
      <Card aria-labelledby="progress-recent">
        <h2 id="progress-recent" className={styles.heading}>
          {t('progress.recent')}
        </h2>
        {recent.length === 0 ? (
          <p className={styles.muted}>{t('progress.recentNone')}</p>
        ) : (
          <ul className={styles.list}>
            {recent.map((r) => (
              <li key={r.id} className={styles.row}>
                <span className={styles.rowText}>
                  <b>{r.title}</b>
                  <span className={styles.rowMeta}>
                    {format.dateTime(r.finishedAt, SHORT_DATE)}
                    {' · '}
                    {t('home.tries', { count: r.triesUsed })}
                  </span>
                </span>
                <span
                  className={styles.score}
                  aria-label={t('progress.scoreLabel', {
                    correct: r.questionsCorrect,
                    total: r.questionsTotal,
                  })}
                >
                  {t('progress.score', { correct: r.questionsCorrect, total: r.questionsTotal })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
