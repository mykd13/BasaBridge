'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReducer, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Eyebrow, Notice, OptionCard, OptionList, StepDots } from '@basabridge/ui';
import type { PracticeCheck, PracticeItemView } from '../../server/learn/port';
import { lessonHref } from '../../server/learn/return-path';
import { practiceReducer, startPractice } from './practice-state';
import { SpeakText } from './SpeakText';
import { WordTapText } from './WordTapText';

export interface PracticeRunnerProps {
  lessonId: string;
  items: PracticeItemView[];
  initialItem: number;
  /** Index of the practice step in the lesson, so the saved place points at it. */
  practiceStep: number;
  returnTo: string | null;
  check: (itemId: string, index: number) => Promise<PracticeCheck>;
  savePosition: (lessonId: string, position: { step: number; item: number }) => Promise<void>;
}

const LETTERS = 'ABCDEFGH';
const STRONG = { emphasis: 'strong' } as const;
const POLITE = { live: 'polite' } as const;

function optionStateFor(wrong: boolean, answered: boolean, isAnswer: boolean) {
  if (wrong) return 'wrong';
  if (!answered) return 'idle';
  return isAnswer ? 'correct' : 'dimmed';
}

/** H4: guided practice. Feedback is instant, a hint shows after a miss, and word tap is on. */
export function PracticeRunner(props: PracticeRunnerProps) {
  const { lessonId, items, practiceStep, returnTo } = props;
  const t = useTranslations();
  const router = useRouter();
  const [state, dispatch] = useReducer(
    practiceReducer,
    Math.min(Math.max(props.initialItem, 0), items.length - 1),
    startPractice,
  );
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const item = items[state.index];
  if (!item) return null;
  const last = state.index === items.length - 1;
  const answered = state.outcome !== 'choosing';
  const correctIndex = state.correctText === null ? -1 : item.options.indexOf(state.correctText);

  async function choose(choice: number) {
    if (busy || answered || !item) return;
    setBusy(true);
    try {
      const result = await props.check(item.id, choice);
      dispatch({ type: 'checked', choice, ...result });
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (last) {
      router.push(lessonHref(lessonId, returnTo, '/done'));
      return;
    }
    dispatch({ type: 'next' });
    startTransition(() =>
      props.savePosition(lessonId, { step: practiceStep, item: state.index + 1 }),
    );
  }

  return (
    <main className="bb-learn bb-practice">
      <StepDots
        current={state.index + 1}
        total={items.length}
        label={t('learn.practice.item', { current: state.index + 1, total: items.length })}
      />
      {item.passage ? (
        <Card>
          <Eyebrow>{t('learn.practice.readThis')}</Eyebrow>
          <WordTapText text={item.passage} />
          <p className="bb-practice__tap">{t('learn.practice.tapWord')}</p>
        </Card>
      ) : null}
      <Card {...STRONG}>
        <div className="bb-learn__head">
          <h1 className="bb-practice__prompt">{item.prompt}</h1>
          <SpeakText
            text={`${item.prompt}. ${item.options.join('. ')}`}
            label={t('learn.practice.listenQuestion')}
          />
        </div>
        <OptionList label={item.prompt}>
          {item.options.map((option, i) => {
            const letter = LETTERS[i] ?? String(i + 1);
            const optionState = optionStateFor(
              state.wrong.includes(i),
              answered,
              i === correctIndex,
            );
            return (
              <OptionCard
                key={option}
                letter={letter}
                state={optionState}
                disabled={busy}
                onClick={() => choose(i)}
              >
                {option}
              </OptionCard>
            );
          })}
        </OptionList>
        {state.hintShown ? (
          <Notice tone="warn" title={t('learn.practice.hint')} {...POLITE}>
            <p>{item.hint}</p>
          </Notice>
        ) : null}
        {state.outcome === 'choosing' && state.wrong.length > 0 ? (
          <p role="status">{t('learn.practice.notQuite')}</p>
        ) : null}
        {state.outcome === 'right' ? (
          <Notice tone="good" {...POLITE}>
            <p>
              <strong>{t('learn.practice.yes')}</strong>{' '}
              {t('learn.practice.answerIs', { answer: state.correctText ?? '' })}
            </p>
          </Notice>
        ) : null}
        {state.outcome === 'revealed' ? (
          <Notice tone="accent" {...POLITE}>
            <p>{t('learn.practice.answerIs', { answer: state.correctText ?? '' })}</p>
          </Notice>
        ) : null}
        <div className="bb-learn__actions">
          {answered ? (
            <Button onClick={next}>
              {last ? t('learn.practice.finish') : t('learn.practice.next')}
            </Button>
          ) : null}
          <Link className="bb-learn__leave" href={returnTo ?? '/learn'}>
            {returnTo ? t('learn.leave') : t('learn.backToLearn')}
          </Link>
        </div>
      </Card>
    </main>
  );
}
