'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Eyebrow, StepDots } from '@basabridge/ui';
import { lessonHref } from '../../server/learn/return-path';
import { SpeakText } from './SpeakText';
import type { TeachStep } from './steps';

const STRONG = { emphasis: 'strong' } as const;

export interface WalkthroughProps {
  lessonId: string;
  title: string;
  goal: string;
  /** Heading of the lesson's skill group, such as "Thinking about the story". */
  group: string;
  steps: TeachStep[];
  initialIndex: number;
  /** Index of the practice step in the lesson, or null when the lesson has none. */
  practiceStep: number | null;
  /** A path from the return allow-list, or null. */
  returnTo: string | null;
  savePosition: (lessonId: string, position: { step: number; item: number }) => Promise<void>;
}

/** H3: one explain or example step at a time. Every move saves the place, so leaving keeps it. */
export function LessonWalkthrough(props: WalkthroughProps) {
  const { lessonId, steps, practiceStep, returnTo, savePosition } = props;
  const t = useTranslations();
  const router = useRouter();
  const [index, setIndex] = useState(Math.min(props.initialIndex, steps.length - 1));
  const [, startTransition] = useTransition();
  const step = steps[index];
  const last = index === steps.length - 1;

  function go(target: number) {
    const to = steps[target];
    if (!to) return;
    setIndex(target);
    startTransition(() => savePosition(lessonId, { step: to.index, item: 0 }));
  }

  function leaveForward() {
    startTransition(async () => {
      if (practiceStep !== null) {
        await savePosition(lessonId, { step: practiceStep, item: 0 });
        router.push(lessonHref(lessonId, returnTo, '/practice'));
      } else {
        router.push(lessonHref(lessonId, returnTo, '/done'));
      }
    });
  }

  if (!step) return null;
  const spoken = step.kind === 'explain' ? step.text : `${step.passage} ${step.point}`;
  return (
    <div className="bb-learn bb-lesson">
      <Eyebrow>{t('learn.lesson.kicker', { group: props.group })}</Eyebrow>
      <div className="bb-learn__head">
        <h1>{props.title}</h1>
        <SpeakText text={`${props.title}. ${props.goal}`} label={t('learn.listenPage')} size="lg" />
      </div>
      <p className="bb-lesson__goal">{t('learn.lesson.goal', { goal: props.goal })}</p>
      <StepDots
        current={index + 1}
        total={steps.length}
        label={t('learn.lesson.step', { current: index + 1, total: steps.length })}
      />
      <Card {...STRONG} aria-live="polite">
        <div className="bb-learn__head">
          <Eyebrow tone="accent">
            {step.kind === 'explain' ? t('learn.lesson.trick') : t('learn.lesson.example')}
          </Eyebrow>
          <SpeakText text={spoken} label={t('learn.lesson.listen')} />
        </div>
        {step.kind === 'explain' ? (
          <p className="bb-lesson__text">{step.text}</p>
        ) : (
          <>
            <p className="bb-lesson__text">{step.passage}</p>
            <p className="bb-lesson__text">{step.point}</p>
          </>
        )}
      </Card>
      <div className="bb-learn__actions">
        {index > 0 ? (
          <Button variant="secondary" onClick={() => go(index - 1)}>
            {t('learn.lesson.back')}
          </Button>
        ) : null}
        {last ? (
          <Button onClick={leaveForward}>
            {practiceStep !== null ? t('learn.lesson.tryIt') : t('learn.lesson.finish')}
          </Button>
        ) : (
          <Button onClick={() => go(index + 1)}>{t('learn.lesson.next')}</Button>
        )}
        <Link className="bb-learn__leave" href={returnTo ?? '/learn'}>
          {returnTo ? t('learn.leave') : t('learn.backToLearn')}
        </Link>
      </div>
    </div>
  );
}
