'use client';

import { Button, OptionCard, OptionList, SpeakerButton, StepDots } from '@basabridge/ui';
import { ArrowRight } from '@basabridge/ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { submitAnswerAction } from '@/server/student/actions';
import type { AnswerFeedback, QuestionView } from '@/server/student/schemas';
import { accommodationsUsed, letterFor, optionStates } from './question-state';
import { canSpeak, speakText } from './speak';
import './student.css';

type Question = Extract<QuestionView, { status: 'question' }>;

/** Read the question and its answers aloud. Only text on screen is spoken. */
function speak(question: Question, onEnd: () => void): void {
  const parts = [question.text, ...question.options.map((o, i) => `${letterFor(i)}. ${o}`)];
  speakText(parts.join('. '), onEnd);
}

/**
 * Canvas C1 and C2 (S8, S9). One question at a time, with the story hidden. The server scores
 * the answer and says which option is right; the browser only shows it (rule 5).
 * Give this component a `key` of the question id so it starts fresh for each question.
 */
export function QuestionFlow({ question }: { question: Question }) {
  const t = useTranslations('student.questions');
  const router = useRouter();
  const [chosen, setChosen] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [usedReadAloud, setUsedReadAloud] = useState(false);
  const shownAt = useRef(Date.now());
  const [voice, setVoice] = useState(false);

  useEffect(() => {
    const supported = canSpeak();
    setVoice(supported);
    shownAt.current = Date.now();
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, []);

  const states = optionStates(question.options.length, chosen, feedback);

  const check = async () => {
    if (chosen === null || busy) return;
    setBusy(true);
    setFailed(false);
    const result = await submitAnswerAction({
      sessionId: question.sessionId,
      questionId: question.questionId,
      chosen: [chosen],
      responseMs: Math.max(0, Date.now() - shownAt.current),
      accommodations: accommodationsUsed(usedReadAloud),
    });
    setBusy(false);
    if (result.ok) setFeedback(result.data);
    else setFailed(true);
  };

  const toggleListen = () => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    setUsedReadAloud(true);
    setPlaying(true);
    speak(question, () => setPlaying(false));
  };

  const next = () => {
    if (feedback?.last) router.push('/read/result');
    else router.refresh();
  };

  return (
    <div className="bb-s-page bb-s-page--narrow">
      <StepDots
        current={question.index}
        total={question.total}
        label={t('stepLabel', { n: question.index, total: question.total })}
      />
      <p className="bb-s-muted">{t('hint')}</p>
      <div className="bb-s-qhead">
        <h1 className="bb-s-question">{question.text}</h1>
        {question.readAloud && voice ? (
          <SpeakerButton label={t('listen')} playing={playing} onClick={toggleListen} />
        ) : null}
      </div>
      <OptionList label={t('choices')}>
        {question.options.map((option, index) => (
          <OptionCard
            key={option}
            letter={letterFor(index)}
            state={states[index]}
            statusLabel={
              states[index] === 'correct'
                ? index === chosen
                  ? t('statusCorrect')
                  : t('statusRight')
                : states[index] === 'wrong'
                  ? t('statusWrong')
                  : undefined
            }
            disabled={busy}
            onClick={() => setChosen(index)}
          >
            {option}
          </OptionCard>
        ))}
      </OptionList>
      <div aria-live="polite">
        {failed ? <p className="bb-s-feedback bb-s-feedback--bad">{t('saveFailed')}</p> : null}
        {feedback ? (
          <p className={`bb-s-feedback bb-s-feedback--${feedback.correct ? 'good' : 'bad'}`}>
            {feedback.correct
              ? t('correct')
              : t('wrong', {
                  letter: letterFor(feedback.correctIndex),
                  answer: question.options[feedback.correctIndex] ?? '',
                })}
          </p>
        ) : null}
      </div>
      <div className="bb-s-actions">
        {feedback ? (
          <>
            <Button icon={<ArrowRight size={22} />} onClick={next}>
              {feedback.last ? t('seeResult') : t('next')}
            </Button>
            {!feedback.correct && feedback.learnLessonId ? (
              <Link
                className="bb-btn bb-btn--ghost bb-btn--md"
                href={`/learn/${encodeURIComponent(feedback.learnLessonId)}`}
              >
                {t('learn')}
              </Link>
            ) : null}
          </>
        ) : (
          <Button
            disabled={chosen === null || busy}
            aria-busy={busy}
            aria-describedby={chosen === null ? 'choose-hint' : undefined}
            onClick={() => void check()}
          >
            {busy ? t('checking') : t('check')}
          </Button>
        )}
      </div>
      {!feedback && chosen === null ? (
        <p id="choose-hint" className="bb-s-muted">
          {t('choose')}
        </p>
      ) : null}
    </div>
  );
}
