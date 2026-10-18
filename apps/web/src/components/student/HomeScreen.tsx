import { Card, Eyebrow, LevelCard } from '@basabridge/ui';
import { ArrowRight, Star } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import type { StudentHome } from '@/server/student/schemas';
import { LinkButton } from './common';

/** Canvas A3 (S2): greeting, the teacher's note, two actions and the level card. */
export function HomeScreen({ home }: { home: StudentHome }) {
  const t = useTranslations('student');
  const progress = home.progress;
  return (
    <div className="bb-s-page">
      <h1 className="bb-s-title">
        {home.displayName
          ? t('home.greetingNamed', { name: home.displayName })
          : t('home.greeting')}
      </h1>
      <div className="bb-s-split bb-s-split--2">
        <div className="bb-s-stack">
          <Card emphasis="strong">
            <Eyebrow>{t('common.teacherSays')}</Eyebrow>
            <p className="bb-s-lead">
              {home.note ? home.note.text : t('common.teacherSaysNoNote')}
            </p>
          </Card>
          <div className="bb-s-actions">
            <LinkButton href="/read" icon={<ArrowRight size={22} />}>
              {t('home.readNew')}
            </LinkButton>
            <LinkButton href="/progress" variant="secondary" icon={<Star size={22} />}>
              {t('home.seeProgress')}
            </LinkButton>
          </div>
        </div>
        <LevelCard
          eyebrow={t('home.levelEyebrow')}
          level={home.level}
          suffix={t('home.levelSuffix', { max: home.maxLevel })}
          progress={
            progress
              ? {
                  value: progress.needed > 0 ? progress.passed / progress.needed : 0,
                  label: t('home.levelProgressLabel'),
                  valueText: t('home.levelProgress', {
                    passed: progress.passed,
                    needed: progress.needed,
                    next: progress.nextLevel,
                  }),
                }
              : undefined
          }
        >
          {progress ? (
            <p className="bb-s-muted">
              {t('home.levelProgress', {
                passed: progress.passed,
                needed: progress.needed,
                next: progress.nextLevel,
              })}
            </p>
          ) : null}
          <p className="bb-s-lead">
            {home.triesPerStory === null
              ? t('common.triesUnlimited')
              : t('common.triesCount', { count: home.triesPerStory })}
          </p>
          <p className="bb-s-muted">
            {t('home.wordsInfo', { min: home.words.min, max: home.words.max })}
          </p>
        </LevelCard>
      </div>
    </div>
  );
}
