import { Card, Chip, Eyebrow, LevelCard, Notice } from '@basabridge/ui';
import { MAX_LEVEL, PASS_RULE, TIERS, tierFor, triesFor } from '@basabridge/levels';
import { standardActivity } from '@basabridge/teacher-ai';
import { useFormatter, useTranslations } from 'next-intl';
import type {
  ParentNotes,
  PatternRow,
  ProgressView,
  ScreenState,
  SkillRow,
} from '@/server/parent/types';
import { CARD, percent } from './format';
import { ScreenFrame } from './ScreenFrame';

function useTriesText() {
  const t = useTranslations();
  return (tries: number | null) =>
    tries === null ? t('parent.progress.tries.unlimited') : String(tries);
}

function Skill({ row }: { row: SkillRow }) {
  const t = useTranslations();
  const format = useFormatter();
  const { measure } = row;
  const value =
    measure.kind === 'pace' ? measure.wordsPerMinute : percent(measure.right, measure.total);
  const detail =
    measure.kind === 'pace'
      ? t('parent.progress.skills.pace')
      : t(
          measure.kind === 'words'
            ? 'parent.progress.skills.wordsRight'
            : 'parent.progress.skills.correct',
          { right: format.number(measure.right), total: format.number(measure.total) },
        );
  return (
    <Card as={CARD.article}>
      <div className="bb-parent__row">
        <h3>{t(`parent.skills.${row.skill}.name`)}</h3>
        <Chip tone={row.confidence === 'steady' ? 'good' : 'accent'}>
          {t(`parent.confidence.${row.confidence}`)}
        </Chip>
      </div>
      <p className="bb-parent__muted">{t(`parent.skills.${row.skill}.about`)}</p>
      <p className="bb-parent__stat">{measure.kind === 'pace' ? value : `${value}%`}</p>
      <p>{detail}</p>
      {row.change ? (
        <p className="bb-parent__muted">
          {t(row.change > 0 ? 'parent.progress.skills.up' : 'parent.progress.skills.down', {
            delta: Math.abs(row.change),
          })}
        </p>
      ) : null}
    </Card>
  );
}

function Pattern({ row }: { row: PatternRow }) {
  const t = useTranslations();
  const [from = '', to = ''] = row.key.split('>');
  return (
    <Card as={CARD.article}>
      <p>{t(`parent.progress.patterns.${row.kind}`, { key: row.key, from, to })}</p>
      <p className="bb-parent__muted">
        {t('parent.progress.patterns.counts', { count: row.count, tries: row.tries })}
      </p>
      <Chip>{t(`parent.progress.patterns.confidence.${row.confidence}`)}</Chip>
    </Card>
  );
}

function HomeActivity({
  notes,
  focus,
}: {
  notes: ParentNotes | null;
  focus: ProgressView['plan']['focus'];
}) {
  const t = useTranslations();
  // Until BB-20 lands the notes are null, and the standard activity from packages/teacher-ai is shown.
  const activity = notes?.homeActivity ?? standardActivity(focus);
  const aiWrote = notes?.source === 'ai' && activity.source === 'ai';
  return (
    <Card as={CARD.section} aria-labelledby="bb-home-activity">
      <h2 id="bb-home-activity">{t('parent.progress.notes.title')}</h2>
      {notes ? null : <p className="bb-parent__muted">{t('parent.progress.notes.notReady')}</p>}
      <h3>{activity.title}</h3>
      <p className="bb-parent__muted">
        {t('parent.progress.notes.minutes', { minutes: activity.minutes })}
        {' · '}
        {aiWrote ? t('parent.progress.notes.ai') : t('parent.progress.notes.standardActivity')}
      </p>
      <ol className="bb-parent__steps">
        {activity.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>{t('parent.progress.notes.tip', { tip: activity.tip })}</p>
    </Card>
  );
}

function Progress({ data }: { data: ProgressView }) {
  const t = useTranslations();
  const triesText = useTriesText();
  const { level, plan } = data;
  const tier = tierFor(level.level);
  const nextTier = TIERS.find((candidate) => candidate.from > tier.to);
  const needed = PASS_RULE.passesToLevelUp;
  const atTop = level.level >= MAX_LEVEL;

  return (
    <>
      <div className="bb-parent__grid">
        <LevelCard
          eyebrow={t('parent.progress.level.eyebrow')}
          level={level.level}
          suffix={t('parent.progress.level.of', { max: MAX_LEVEL })}
          progress={
            atTop
              ? undefined
              : {
                  value: Math.min(level.passes, needed) / needed,
                  label: t('parent.progress.level.progressLabel'),
                  valueText: t('parent.progress.level.progressText', {
                    passes: level.passes,
                    needed,
                    next: level.level + 1,
                  }),
                }
          }
        >
          <p>
            {atTop
              ? t('parent.progress.level.top')
              : t('parent.progress.level.progressText', {
                  passes: level.passes,
                  needed,
                  next: level.level + 1,
                })}
          </p>
        </LevelCard>
        <Card as={CARD.section}>
          <Eyebrow>{t('parent.progress.tries.title')}</Eyebrow>
          <p className="bb-parent__stat">{triesText(triesFor(level.level))}</p>
          {nextTier ? (
            <p className="bb-parent__muted">
              {t('parent.progress.tries.next', {
                tries: triesText(nextTier.tries),
                level: nextTier.from,
              })}
            </p>
          ) : null}
        </Card>
        <Card as={CARD.section}>
          <Eyebrow>{t('parent.progress.averageTries.title')}</Eyebrow>
          {data.averageTries ? (
            <>
              <p className="bb-parent__stat">{data.averageTries.value.toFixed(1)}</p>
              <p className="bb-parent__muted">
                {t('parent.progress.averageTries.note', { count: data.averageTries.stories })}
              </p>
            </>
          ) : (
            <p className="bb-parent__muted">{t('parent.progress.averageTries.none')}</p>
          )}
        </Card>
      </div>

      <section className="bb-parent__section" aria-labelledby="bb-skills">
        <h2 id="bb-skills">{t('parent.progress.skills.title')}</h2>
        <p className="bb-parent__muted">{t('parent.progress.skills.intro')}</p>
        <div className="bb-parent__grid">
          {data.skills.map((row) => (
            <Skill key={row.skill} row={row} />
          ))}
        </div>
      </section>

      <section className="bb-parent__section" aria-labelledby="bb-patterns">
        <h2 id="bb-patterns">{t('parent.progress.patterns.title')}</h2>
        <p className="bb-parent__muted">{t('parent.progress.patterns.intro')}</p>
        {data.patterns.length === 0 ? (
          <p>{t('parent.progress.patterns.none')}</p>
        ) : (
          <div className="bb-parent__grid">
            {data.patterns.map((row) => (
              <Pattern key={`${row.kind}:${row.key}`} row={row} />
            ))}
          </div>
        )}
        <Notice tone="accent">
          <p>{t('parent.progress.patterns.mishear')}</p>
        </Notice>
      </section>

      <Card as={CARD.section} aria-labelledby="bb-plan" emphasis={CARD.strong}>
        <h2 id="bb-plan">{t('parent.progress.plan.title')}</h2>
        {plan.lastReading ? (
          <p>
            {plan.lastReading.wordsRightShare === null
              ? t('parent.progress.plan.lastNoVoice', {
                  correct: plan.lastReading.correct,
                  total: plan.lastReading.total,
                })
              : t('parent.progress.plan.last', {
                  correct: plan.lastReading.correct,
                  total: plan.lastReading.total,
                  percent: Math.round(plan.lastReading.wordsRightShare * 100),
                })}{' '}
            {t('parent.progress.plan.next')}
          </p>
        ) : null}
        <p>
          {plan.focus && plan.focusEvidence
            ? t('parent.progress.plan.focus', {
                skill: t(`parent.skills.${plan.focus}.name`),
                right: plan.focusEvidence.right,
                total: plan.focusEvidence.total,
              })
            : t('parent.progress.plan.focusNone')}
        </p>
        <p className="bb-parent__muted">{t('parent.progress.plan.rule')}</p>
        {data.notes ? (
          <>
            <p>{data.notes.whatHappened}</p>
            <p>{data.notes.whyFocus}</p>
          </>
        ) : null}
      </Card>

      <HomeActivity notes={data.notes} focus={plan.focus} />

      <Notice tone="accent" title={t('parent.progress.limits.title')}>
        <p>{t('parent.progress.limits.body')}</p>
      </Notice>
    </>
  );
}

export function ProgressScreen({ state }: { state: ScreenState<ProgressView> }) {
  return (
    <ScreenFrame screen="progress" state={state} summary={(data) => data.summary}>
      {(data) => <Progress data={data} />}
    </ScreenFrame>
  );
}
