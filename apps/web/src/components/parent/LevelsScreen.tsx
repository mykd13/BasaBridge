import { Card, Chip } from '@basabridge/ui';
import { MAX_LEVEL, PASS_RULE, QUESTIONS_PER_STORY, TIERS, tierFor } from '@basabridge/levels';
import { useFormatter, useTranslations } from 'next-intl';
import type { LevelChange, LevelsView, ScreenState } from '@/server/parent/types';
import { CARD, PARENT_TIME_ZONE } from './format';
import { ScreenFrame } from './ScreenFrame';

/** One key per tier, in table order. A test fails when the tier table gains or loses a row. */
export const TIER_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'] as const;

function Change({ change }: { change: LevelChange }) {
  const t = useTranslations();
  const format = useFormatter();
  const when = format.dateTime(new Date(change.at), {
    dateStyle: 'medium',
    timeZone: PARENT_TIME_ZONE,
  });
  const text =
    change.reason === 'placement' || change.from === null
      ? t('parent.levels.history.placement', { to: change.to })
      : t(
          change.reason === 'moved_up' ? 'parent.levels.history.up' : 'parent.levels.history.down',
          {
            from: change.from,
            to: change.to,
          },
        );
  return (
    <li>
      <Card as={CARD.article}>
        <div className="bb-parent__row">
          <p>
            <strong>{text}</strong>
          </p>
          <span className="bb-parent__muted">{when}</span>
        </div>
      </Card>
    </li>
  );
}

function Levels({ data }: { data: LevelsView }) {
  const t = useTranslations();
  const current = tierFor(data.summary.level);
  return (
    <>
      <p>{t('parent.levels.intro', { max: MAX_LEVEL })}</p>

      <section className="bb-parent__section" aria-labelledby="bb-history">
        <h2 id="bb-history">{t('parent.levels.history.title')}</h2>
        {data.history.length === 0 ? (
          <p className="bb-parent__muted">{t('parent.states.empty.levels')}</p>
        ) : (
          <ol className="bb-parent__list" aria-label={t('parent.levels.history.list')}>
            {data.history.map((change) => (
              <Change key={change.id} change={change} />
            ))}
          </ol>
        )}
      </section>

      <section className="bb-parent__section" aria-labelledby="bb-table">
        <h2 id="bb-table">{t('parent.levels.table.title')}</h2>
        <div
          className="bb-parent__scroll"
          role="region"
          aria-label={t('parent.levels.table.scroll')}
          tabIndex={0}
        >
          <table className="bb-parent__table">
            <thead>
              <tr>
                <th scope="col">{t('parent.levels.table.levels')}</th>
                <th scope="col">{t('parent.levels.table.length')}</th>
                <th scope="col">{t('parent.levels.table.words')}</th>
                <th scope="col">{t('parent.levels.table.tries')}</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier, index) => {
                const here = tier.from === current.from;
                const key = TIER_KEYS[index];
                return (
                  <tr key={tier.from} data-current={here}>
                    <th scope="row">
                      {t('parent.levels.table.range', { from: tier.from, to: tier.to })}
                      {here ? (
                        <>
                          <br />
                          <Chip>
                            {t('parent.levels.table.here', { level: data.summary.level })}
                          </Chip>
                        </>
                      ) : null}
                    </th>
                    <td data-label={t('parent.levels.table.length')}>
                      {t('parent.levels.table.wordsRange', {
                        min: tier.words.min,
                        max: tier.words.max,
                      })}
                    </td>
                    <td data-label={t('parent.levels.table.words')}>
                      {key ? t(`parent.levels.tier.${key}`) : null}
                    </td>
                    <td data-label={t('parent.levels.table.tries')}>
                      {tier.tries === null ? t('parent.progress.tries.unlimited') : tier.tries}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bb-parent__section" aria-labelledby="bb-tries">
        <h2 id="bb-tries">{t('parent.levels.tries.title')}</h2>
        <p>{t('parent.levels.tries.one')}</p>
        <p>{t('parent.levels.tries.two')}</p>
      </section>

      <section className="bb-parent__section" aria-labelledby="bb-pass">
        <h2 id="bb-pass">{t('parent.levels.pass.title')}</h2>
        <p>
          {t('parent.levels.pass.story', {
            words: Math.round(PASS_RULE.minWordsRight * 100),
            correct: PASS_RULE.minQuestionsCorrect,
            total: QUESTIONS_PER_STORY,
          })}
        </p>
        <p>
          {t('parent.levels.pass.move', {
            passes: PASS_RULE.passesToLevelUp,
            share: Math.round(PASS_RULE.veryWeakShare * 100),
          })}
        </p>
        <p>{t('parent.levels.pass.evidence')}</p>
        <p className="bb-parent__muted">{t('parent.levels.pass.tune')}</p>
      </section>
    </>
  );
}

export function LevelsScreen({ state }: { state: ScreenState<LevelsView> }) {
  return (
    <ScreenFrame screen="levels" state={state} summary={(data) => data.summary}>
      {(data) => <Levels data={data} />}
    </ScreenFrame>
  );
}
