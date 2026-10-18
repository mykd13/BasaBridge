import { Card, Chip, Eyebrow, LevelCard, ProgressBar } from '@basabridge/ui';
import { ArrowRight, Check, CircleAlert, Star } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import type { LevelUpView, ResultView } from '@/server/student/schemas';
import { LinkButton } from './common';
import './student.css';

const SKILL_KEYS = {
  vocabulary: 'skillVocabulary',
  literal: 'skillLiteral',
  inferential: 'skillInferential',
} as const;

/** Canvas C3 and H1 (S11): the questions answered, the teacher's note and the level progress. */
export function ResultScreen({ result }: { result: ResultView }) {
  const t = useTranslations('student');
  const lower = {
    vocabulary: 'skillVocabularyLower',
    literal: 'skillLiteralLower',
    inferential: 'skillInferentialLower',
  } as const;
  return (
    <div className="bb-s-page">
      <div className="bb-s-row">
        <h1 className="bb-s-title">
          {t('result.answered', { right: result.answered.right, total: result.answered.total })}
        </h1>
        <Chip
          tone={result.passed ? 'good' : 'warn'}
          size="lg"
          icon={result.passed ? <Check size={20} /> : <CircleAlert size={20} />}
        >
          {result.silent
            ? t('result.silent')
            : result.readToEnd
              ? t('result.readToEnd')
              : t('result.notReadToEnd')}
        </Chip>
      </div>
      <div className="bb-s-split bb-s-split--2">
        <div className="bb-s-stack">
          <Card>
            {result.wordsRightPct !== null ? (
              <p className="bb-s-lead">
                {t('result.wordsRight', { pct: Math.round(result.wordsRightPct) })}
              </p>
            ) : null}
            <Eyebrow>{t('result.skillsTitle')}</Eyebrow>
            <ul className="bb-s-list">
              {result.skills.map(({ skill, right, total }) => (
                <li key={skill}>
                  <span>{t(`common.${SKILL_KEYS[skill]}`)}</span>
                  <strong>{t('result.skillRow', { right, total })}</strong>
                </li>
              ))}
            </ul>
          </Card>
          {result.note ? (
            <Card emphasis="strong">
              <Eyebrow>{t('common.teacherSays')}</Eyebrow>
              <p className="bb-s-lead">{result.note.text}</p>
            </Card>
          ) : null}
        </div>
        <LevelCard eyebrow={t('common.level', { level: result.level })} level={result.level}>
          <p className="bb-s-lead">{result.passed ? t('result.passed') : t('result.notPassed')}</p>
          {result.passedInRow ? (
            <>
              <ProgressBar
                value={result.passedInRow.passed}
                max={result.passedInRow.needed}
                label={t('result.inARowLabel')}
                valueText={t('result.inARow', {
                  passed: result.passedInRow.passed,
                  needed: result.passedInRow.needed,
                })}
                segments={result.passedInRow.needed}
                tone="good"
              />
              <p className="bb-s-muted">
                {t('result.inARow', {
                  passed: result.passedInRow.passed,
                  needed: result.passedInRow.needed,
                })}
              </p>
            </>
          ) : null}
          {result.levelChange ? (
            <p className="bb-s-lead">
              {result.levelChange.to > result.levelChange.from
                ? t('result.newLevel', { level: result.levelChange.to })
                : t('result.changedLevel', { level: result.levelChange.to })}
            </p>
          ) : null}
        </LevelCard>
      </div>
      {result.learn ? (
        <Card>
          <p className="bb-s-lead">
            {t('result.learnOffer', { skill: t(`common.${lower[result.learn.skill]}`) })}
          </p>
          <div className="bb-s-actions">
            <LinkButton
              href={`/learn/${encodeURIComponent(result.learn.lessonId)}`}
              variant="brand"
              size="md"
            >
              {t('result.learnLink')}
            </LinkButton>
          </div>
        </Card>
      ) : null}
      <div className="bb-s-actions">
        {result.levelChange && result.levelChange.to > result.levelChange.from ? (
          <LinkButton href="/read/level-up" icon={<Star size={22} />}>
            {t('result.seeNewLevel')}
          </LinkButton>
        ) : (
          <LinkButton href="/read" icon={<ArrowRight size={22} />}>
            {t('result.another')}
          </LinkButton>
        )}
        <LinkButton href="/home" variant="secondary">
          {t('result.done')}
        </LinkButton>
      </div>
    </div>
  );
}

/** Canvas C4 (S12): the new level and what changes with it. All numbers come from the server. */
export function LevelUpScreen({ view }: { view: LevelUpView }) {
  const t = useTranslations('student.levelUp');
  const tc = useTranslations('student.common');
  const triesText =
    view.triesNow === null
      ? tc('triesUnlimited')
      : view.triesBefore !== null && view.triesNow !== view.triesBefore
        ? t('triesNow', { count: view.triesNow })
        : t('triesSame', { count: view.triesNow });
  return (
    <div className="bb-s-page bb-s-page--narrow bb-s-page--center">
      <LevelCard variant="hero" eyebrow={t('eyebrow')} level={view.level}>
        <p className="bb-s-lead">{t('passedRow', { count: view.passedInRow })}</p>
      </LevelCard>
      <h1 className="bb-s-title">{t('newTitle', { level: view.level })}</h1>
      <ul className="bb-s-bullets">
        <li>{t('words', { min: view.words.min, max: view.words.max })}</li>
        <li>{t('harder')}</li>
        <li>{triesText}</li>
      </ul>
      {view.nextTries ? (
        <p className="bb-s-muted">
          {t('triesNext', { level: view.nextTries.level, count: view.nextTries.tries })}
        </p>
      ) : null}
      <div className="bb-s-actions">
        <LinkButton href="/read" icon={<ArrowRight size={22} />}>
          {t('read')}
        </LinkButton>
      </div>
    </div>
  );
}
