'use client';

import { Button, Card, Chip, Eyebrow, LevelCard, Notice } from '@basabridge/ui';
import { ArrowRight, Settings } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { deferPlacementAction, startPlacementStoryAction } from '@/server/student/actions';
import type { PlacementStep } from '@/server/student/schemas';
import { LinkButton } from './common';
import './student.css';

type Step<K extends PlacementStep['step']> = Extract<PlacementStep, { step: K }>;

const SKILL_LOWER = {
  vocabulary: 'skillVocabularyLower',
  literal: 'skillLiteralLower',
  inferential: 'skillInferentialLower',
} as const;

/** Runs a placement server action. On success the action redirects, so only a failure comes back. */
function usePlacementAction(action: () => Promise<{ ok: false }>) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return {
    pending,
    failed,
    run: () => {
      setFailed(false);
      start(async () => {
        const result = await action();
        if (!result.ok) setFailed(true);
      });
    },
  };
}

/** Canvas G1: what placement is, and a way to do it later. */
export function PlacementIntro({ step }: { step: Step<'intro'> }) {
  const t = useTranslations('student.placement');
  const begin = usePlacementAction(startPlacementStoryAction);
  const later = usePlacementAction(deferPlacementAction);
  const busy = begin.pending || later.pending;
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <Eyebrow tone="accent">{t('intro.eyebrow')}</Eyebrow>
      <h1 className="bb-s-title">{t('intro.title')}</h1>
      <p className="bb-s-lead">{t('intro.lead')}</p>
      <Card>
        <Eyebrow>{t('intro.whatTitle')}</Eyebrow>
        <ol className="bb-s-steps">
          <li>{t('intro.step1')}</li>
          <li>{t('intro.step2')}</li>
          <li>{t('intro.step3')}</li>
        </ol>
        <p className="bb-s-muted">{t('intro.rules')}</p>
      </Card>
      {!step.micApproved ? <Notice tone="warn">{t('intro.silentNotice')}</Notice> : null}
      {begin.failed || later.failed ? (
        <Notice tone="bad" live="assertive">
          {t('intro.failed')}
        </Notice>
      ) : null}
      <div className="bb-s-actions">
        <Button
          icon={<ArrowRight size={22} />}
          disabled={busy}
          aria-busy={begin.pending}
          onClick={begin.run}
        >
          {t('intro.start')}
        </Button>
        <Button variant="secondary" disabled={busy} aria-busy={later.pending} onClick={later.run}>
          {t('intro.later')}
        </Button>
      </div>
      <p className="bb-s-muted">{t('intro.laterNote')}</p>
    </div>
  );
}

/** Canvas G2: between stories. It shows no scores, so the test stays calm. */
export function PlacementBetween({ step }: { step: Step<'between'> }) {
  const t = useTranslations('student.placement');
  const next = usePlacementAction(startPlacementStoryAction);
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <div className="bb-s-row">
        <Eyebrow tone="accent">{t('between.eyebrow')}</Eyebrow>
        <Chip tone="mark">{t('between.story', { n: step.storyNumber })}</Chip>
      </div>
      <h1 className="bb-s-title">{t('between.title')}</h1>
      <p className="bb-s-lead">{t('between.body')}</p>
      {next.failed ? (
        <Notice tone="bad" live="assertive">
          {t('intro.failed')}
        </Notice>
      ) : null}
      <div className="bb-s-actions">
        <Button
          icon={<ArrowRight size={22} />}
          disabled={next.pending}
          aria-busy={next.pending}
          onClick={next.run}
        >
          {t('between.next')}
        </Button>
        <LinkButton href="/account" variant="secondary">
          {t('between.stop')}
        </LinkButton>
      </div>
      <p className="bb-s-muted">{t('between.saved')}</p>
    </div>
  );
}

/** Canvas G3: the starting level, what we noticed, and whether more reading help is on. */
export function PlacementResultScreen({ step }: { step: Step<'result'> }) {
  const t = useTranslations('student');
  const { result } = step;
  const guess = result.flags.includes('voice_missing');
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <Eyebrow tone="accent">{t('placement.result.eyebrow')}</Eyebrow>
      <LevelCard
        variant="hero"
        eyebrow={t('placement.result.title')}
        level={result.level}
        suffix={t('home.levelSuffix', { max: step.maxLevel })}
      >
        <p className="bb-s-lead">
          {guess ? t('placement.result.guess') : t('placement.result.good')}
        </p>
      </LevelCard>
      <div className="bb-s-actions">
        <LinkButton href="/read" icon={<ArrowRight size={22} />}>
          {t('placement.result.start')}
        </LinkButton>
      </div>
      <p className="bb-s-muted">{t('placement.result.retake', { days: step.retakeDays })}</p>
      {step.strongSkill || step.practiceSkill ? (
        <Card>
          <Eyebrow>{t('placement.result.noticed')}</Eyebrow>
          {step.strongSkill ? (
            <p className="bb-s-lead">
              {t('placement.result.strong', {
                skill: t(`common.${SKILL_LOWER[step.strongSkill]}`),
              })}
            </p>
          ) : null}
          {step.practiceSkill ? (
            <>
              <p className="bb-s-lead">
                {t('placement.result.practise', {
                  skill: t(`common.${SKILL_LOWER[step.practiceSkill]}`),
                })}
              </p>
              <p className="bb-s-muted">
                {t('placement.result.learnNote', {
                  skill: t(`common.${SKILL_LOWER[step.practiceSkill]}`),
                })}
              </p>
              <div className="bb-s-actions">
                <LinkButton href="/learn" variant="brand" size="md">
                  {t('placement.result.learnLink')}
                </LinkButton>
              </div>
            </>
          ) : null}
        </Card>
      ) : null}
      {result.recommendedHelp === 'more' ? (
        <Card>
          <Eyebrow>{t('placement.result.helpTitle')}</Eyebrow>
          <p className="bb-s-lead">{t('placement.result.helpBody')}</p>
          <div className="bb-s-actions">
            <LinkButton
              href="/account/help"
              variant="secondary"
              size="md"
              icon={<Settings size={20} />}
            >
              {t('placement.result.helpLink')}
            </LinkButton>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
