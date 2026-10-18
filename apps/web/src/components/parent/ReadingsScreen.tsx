import { Card, Chip } from '@basabridge/ui';
import { useFormatter, useTranslations } from 'next-intl';
import type {
  QuestionRow,
  ReadingRow,
  ReadingsView,
  ScreenState,
  TryRow,
  WordToCheck,
} from '@/server/parent/types';
import { CARD, PARENT_TIME_ZONE, percent } from './format';
import { ScreenFrame } from './ScreenFrame';

function Tries({ id, tries }: { id: string; tries: TryRow[] }) {
  const t = useTranslations();
  return (
    <section aria-labelledby={`${id}-tries`} className="bb-parent__section">
      <h3 id={`${id}-tries`}>{t('parent.readings.tries.title')}</h3>
      <div
        className="bb-parent__scroll"
        role="region"
        aria-label={t('parent.readings.tries.scroll')}
        tabIndex={0}
      >
        <table className="bb-parent__table">
          <thead>
            <tr>
              <th scope="col">{t('parent.readings.tries.number')}</th>
              <th scope="col">{t('parent.readings.tries.done')}</th>
              <th scope="col">{t('parent.readings.tries.words')}</th>
              <th scope="col">{t('parent.readings.tries.pace')}</th>
            </tr>
          </thead>
          <tbody>
            {tries.map((row) => (
              <tr key={row.number}>
                <th scope="row">
                  {row.counted
                    ? t('parent.readings.tries.counted', { number: row.number })
                    : row.number}
                </th>
                <td data-label={t('parent.readings.tries.done')}>
                  {t(row.completed ? 'parent.readings.tries.yes' : 'parent.readings.tries.no')}
                </td>
                <td data-label={t('parent.readings.tries.words')}>
                  {t('parent.readings.tries.wordsCell', {
                    right: row.wordsRight,
                    total: row.wordsTotal,
                    percent: percent(row.wordsRight, row.wordsTotal),
                  })}
                </td>
                <td data-label={t('parent.readings.tries.pace')}>
                  {t('parent.readings.tries.paceCell', { wpm: row.wordsPerMinute })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Words({ id, words }: { id: string; words: WordToCheck[] }) {
  const t = useTranslations();
  return (
    <section aria-labelledby={`${id}-words`} className="bb-parent__section">
      <h3 id={`${id}-words`}>{t('parent.readings.words.title')}</h3>
      {words.length === 0 ? (
        <p className="bb-parent__muted">{t('parent.readings.words.none')}</p>
      ) : (
        <div
          className="bb-parent__scroll"
          role="region"
          aria-label={t('parent.readings.words.scroll')}
          tabIndex={0}
        >
          <table className="bb-parent__table">
            <thead>
              <tr>
                <th scope="col">{t('parent.readings.words.said')}</th>
                <th scope="col">{t('parent.readings.words.heard')}</th>
                <th scope="col">{t('parent.readings.words.sure')}</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word, index) => (
                <tr key={`${word.expected}:${index}`}>
                  <th scope="row">{word.expected}</th>
                  <td data-label={t('parent.readings.words.heard')}>
                    {word.heard ?? t('parent.readings.words.nothing')}
                  </td>
                  <td data-label={t('parent.readings.words.sure')}>
                    {t(`parent.readings.words.${word.confidence}`)}
                    {word.markedMisheard ? (
                      <>
                        {' '}
                        <Chip tone="good">{t('parent.readings.words.marked')}</Chip>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Question({ row }: { row: QuestionRow }) {
  const t = useTranslations();
  return (
    <li>
      <Card as={CARD.article}>
        <div className="bb-parent__row">
          <p>
            <strong>
              {row.number}. {row.text}
            </strong>
          </p>
          <Chip tone={row.correct ? 'good' : 'bad'}>
            {t(
              row.correct
                ? 'parent.readings.questions.correct'
                : 'parent.readings.questions.missed',
            )}
          </Chip>
        </div>
        <p className="bb-parent__muted">{t(`parent.skills.${row.skill}.name`)}</p>
        {!row.correct && row.chosen !== null && row.answer !== null ? (
          <p>
            {t('parent.readings.questions.chose', { chosen: row.chosen })}
            {' · '}
            {t('parent.readings.questions.answer', { answer: row.answer })}
          </p>
        ) : null}
        <p className="bb-parent__muted">
          {t('parent.readings.questions.evidence', { evidence: row.evidence })}
        </p>
      </Card>
    </li>
  );
}

function Reading({ row }: { row: ReadingRow }) {
  const t = useTranslations();
  const format = useFormatter();
  const when = format.dateTime(new Date(row.readAt), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: PARENT_TIME_ZONE,
  });
  const result =
    row.wordsRightShare === null
      ? t('parent.readings.resultNoVoice', {
          correct: row.questionsCorrect,
          total: row.questionsTotal,
        })
      : t('parent.readings.result', {
          correct: row.questionsCorrect,
          total: row.questionsTotal,
          percent: Math.round(row.wordsRightShare * 100),
        });
  return (
    <li>
      <details className="bb-reading">
        <summary>
          {/* The reading is the h2 of its own block, so the sections inside it are h3. */}
          <h2 className="bb-reading__title">{row.title}</h2>
          <span className="bb-parent__muted">
            {when} · {t('parent.readings.level', { level: row.level })}
          </span>
          <span>{result}</span>
        </summary>
        <div className="bb-reading__body">
          {row.tries.length > 0 ? <Tries id={row.id} tries={row.tries} /> : null}
          <Words id={row.id} words={row.wordsToCheck} />
          <section aria-labelledby={`${row.id}-analysis`} className="bb-parent__section">
            <h3 id={`${row.id}-analysis`}>{t('parent.readings.analysis.title')}</h3>
            {row.analysis ? (
              <>
                <p>{row.analysis.text}</p>
                <p className="bb-parent__muted">
                  {t('parent.readings.analysis.based', { count: row.analysis.differences })}{' '}
                  {t(
                    row.analysis.source === 'ai'
                      ? 'parent.readings.analysis.ai'
                      : 'parent.readings.analysis.standardWording',
                  )}
                </p>
              </>
            ) : (
              <p className="bb-parent__muted">{t('parent.readings.analysis.none')}</p>
            )}
          </section>
          <section aria-labelledby={`${row.id}-questions`} className="bb-parent__section">
            <h3 id={`${row.id}-questions`}>{t('parent.readings.questions.title')}</h3>
            <ul className="bb-parent__list">
              {row.questions.map((question) => (
                <Question key={question.number} row={question} />
              ))}
            </ul>
          </section>
        </div>
      </details>
    </li>
  );
}

export function ReadingsScreen({ state }: { state: ScreenState<ReadingsView> }) {
  const t = useTranslations();
  return (
    <ScreenFrame screen="readings" state={state} summary={(data) => data.summary}>
      {(data) => (
        <ul className="bb-parent__list" aria-label={t('parent.readings.list')}>
          {data.readings.map((row) => (
            <Reading key={row.id} row={row} />
          ))}
        </ul>
      )}
    </ScreenFrame>
  );
}
