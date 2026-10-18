'use client';

import { Card, Chip, Eyebrow, Notice, ProgressBar } from '@basabridge/ui';
import { ArrowRight, MicOff, RotateCcw } from '@basabridge/ui/icons';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ReadingHelpText } from '@/components/reading-help/ReadingHelpText';
import { markMisheardAction, recordWordTapAction } from '@/server/student/actions';
import type { Analysis, Reading, TryLine } from '@/server/student/schemas';
import { LinkButton } from './common';
import { canSpeak, speakText } from './speak';
import './student.css';

function TryList({ tries, label }: { tries: TryLine[]; label: string }) {
  const t = useTranslations('student');
  return (
    <Card>
      <Eyebrow>{label}</Eyebrow>
      <ul className="bb-s-list">
        {tries.map((line) => (
          <li key={line.n}>
            <span>{t(line.best ? 'analysis.tryRowBest' : 'analysis.tryRow', { n: line.n })}</span>
            <strong>{`${Math.round(line.pct)}%`}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Words worth practising. A tap says the word with the browser's voice, only here on the analysis
 * screen and never during a try (ADR 0004). The first tap is recorded on the session's answers.
 */
function PracticeWords({ words, sessionId }: { words: string[]; sessionId: string }) {
  const t = useTranslations('student.analysis');
  const [speaking, setSpeaking] = useState<string | null>(null);
  const recorded = useRef(false);
  const [voice, setVoice] = useState(false);
  useEffect(() => {
    setVoice(canSpeak());
    return () => {
      if (canSpeak()) window.speechSynthesis.cancel();
    };
  }, []);
  if (!voice) {
    return (
      <ul className="bb-s-words">
        {words.map((word) => (
          <li key={word}>
            <span className="bb-s-chip-word">{word}</span>
          </li>
        ))}
      </ul>
    );
  }
  const hear = (word: string) => {
    setSpeaking(word);
    speakText(word, () => setSpeaking(null));
    if (!recorded.current) {
      recorded.current = true;
      // The server adds `word_tap` to the answers of this session. A failed save is tried again on
      // the next tap, so the record is never silently lost.
      void recordWordTapAction({ sessionId }).then((result) => {
        if (!result.ok) recorded.current = false;
      });
    }
  };
  return (
    <>
      <p className="bb-s-muted">{t('wordTapHint')}</p>
      <ul className="bb-s-words">
        {words.map((word) => (
          <li key={word}>
            <button
              type="button"
              className="bb-s-word"
              aria-pressed={speaking === word}
              aria-label={t('wordTapWord', { word })}
              onClick={() => hear(word)}
            >
              {word}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Note({ analysis }: { analysis: Analysis }) {
  const t = useTranslations('student.analysis');
  return (
    <Card emphasis="strong">
      <Eyebrow>{t('noteTitle')}</Eyebrow>
      {analysis.notes.length === 0 ? (
        <p className="bb-s-lead">{t('noNote')}</p>
      ) : (
        analysis.notes.map((note) => (
          <p key={note.text} className="bb-s-lead">
            {note.text}
          </p>
        ))
      )}
      {analysis.practiceWords.length > 0 ? (
        <>
          <Eyebrow>{t('wordsToPractise')}</Eyebrow>
          <PracticeWords words={analysis.practiceWords} sessionId={analysis.sessionId} />
        </>
      ) : null}
    </Card>
  );
}

/** Words the speech check could not hear well. A tap tells the server it was read right. */
function Unclear({ words }: { words: Analysis['unclearWords'] }) {
  const t = useTranslations('student.analysis');
  const [marked, setMarked] = useState<ReadonlySet<number>>(new Set());
  const [failed, setFailed] = useState(false);
  if (words.length === 0) return null;
  const mark = async (index: number) => {
    setFailed(false);
    const result = await markMisheardAction({ index });
    if (result.ok) setMarked((previous) => new Set(previous).add(index));
    else setFailed(true);
  };
  return (
    <Card>
      <p className="bb-s-lead">{t('misheardLead')}</p>
      <ul className="bb-s-words">
        {words.map(({ index, word }) => (
          <li key={index}>
            <button
              type="button"
              className="bb-s-word"
              aria-pressed={marked.has(index)}
              aria-label={t('misheardWord', { word })}
              disabled={marked.has(index)}
              onClick={() => void mark(index)}
            >
              {word}
            </button>
          </li>
        ))}
      </ul>
      <p className="bb-s-muted" aria-live="polite">
        {failed ? t('markFailed') : marked.size > 0 ? t('misheardThanks') : ''}
      </p>
    </Card>
  );
}

function TryAgain({ analysis }: { analysis: Analysis }) {
  const t = useTranslations('student.analysis');
  if (analysis.triesLeft === 0) return null;
  return (
    <LinkButton href="/read" variant="secondary" icon={<RotateCcw size={22} />}>
      {analysis.triesLeft === null
        ? t('tryAgainUnlimited')
        : t('tryAgain', { count: analysis.triesLeft })}
    </LinkButton>
  );
}

/** Canvas B4 (S6): what the reading analysis found. The counts come from the server. */
export function AnalysisScreen({ analysis }: { analysis: Analysis }) {
  const t = useTranslations('student');
  const needsReview = analysis.review === 'needs_review' || analysis.conditions.length > 0;
  return (
    <div className="bb-s-page">
      <div className="bb-s-row">
        <h1 className="bb-s-title">{t('analysis.doneTitle')}</h1>
        <Chip tone="warn" icon={<MicOff size={18} />}>
          {t('common.micOff')}
        </Chip>
      </div>
      {needsReview ? <Notice tone="warn">{t('analysis.reviewNotice')}</Notice> : null}
      <div className="bb-s-split bb-s-split--2">
        <div className="bb-s-stack">
          <Card>
            <div className="bb-s-stats">
              <div className="bb-s-stat">
                <Eyebrow>{t('analysis.wordsRight')}</Eyebrow>
                <p className="bb-s-big">
                  {t('analysis.wordsRightValue', {
                    right: analysis.wordsRight,
                    total: analysis.wordsTotal,
                  })}
                </p>
                <ProgressBar
                  value={analysis.wordsRight}
                  max={analysis.wordsTotal}
                  label={t('analysis.wordsRight')}
                  valueText={t('analysis.wordsRightValue', {
                    right: analysis.wordsRight,
                    total: analysis.wordsTotal,
                  })}
                  tone="good"
                />
              </div>
              <div className="bb-s-stat">
                <Eyebrow>{t('analysis.pace')}</Eyebrow>
                <p className="bb-s-big">
                  {t('analysis.paceValue', { wpm: Math.round(analysis.wordsPerMinute) })}
                </p>
              </div>
            </div>
          </Card>
          {analysis.tries.length > 0 ? (
            <TryList tries={analysis.tries} label={t('analysis.triesTitle')} />
          ) : null}
          <p className="bb-s-muted" aria-live="polite">
            {analysis.triesLeft === null
              ? ''
              : analysis.triesLeft === 0
                ? t('analysis.noTriesLeft')
                : t('analysis.triesLeft', { count: analysis.triesLeft })}
          </p>
        </div>
        <div className="bb-s-stack">
          <Note analysis={analysis} />
          <Unclear words={analysis.unclearWords} />
        </div>
      </div>
      <div className="bb-s-actions">
        <LinkButton href="/read/questions" icon={<ArrowRight size={22} />}>
          {t('analysis.answer')}
        </LinkButton>
        <TryAgain analysis={analysis} />
      </div>
    </div>
  );
}

/** Canvas D1 (S7): the learner stopped before the end. Shows where, and how to carry on. */
export function StoppedEarlyScreen({ analysis }: { analysis: Analysis }) {
  const t = useTranslations('student');
  const stop = analysis.stoppedAt;
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <div className="bb-s-row">
        <h1 className="bb-s-title">{t('analysis.stopped.title', { word: stop?.word ?? '' })}</h1>
        <Chip tone="warn" icon={<MicOff size={18} />}>
          {t('common.micOff')}
        </Chip>
      </div>
      <p className="bb-s-lead">
        {analysis.triesAllowed === null
          ? t('analysis.stopped.leadUnlimited')
          : t('analysis.stopped.lead', { n: analysis.tryNumber, total: analysis.triesAllowed })}
      </p>
      {stop ? (
        <ReadingHelpText>
          <p className="bb-s-excerpt">{stop.excerpt}</p>
        </ReadingHelpText>
      ) : null}
      <div className="bb-s-actions">
        <LinkButton href="/read?from=rest">{t('analysis.stopped.rest')}</LinkButton>
        <LinkButton href="/read?from=top" variant="secondary">
          {t('analysis.stopped.top')}
        </LinkButton>
      </div>
    </div>
  );
}

/** Canvas D2 (S10): every try is used. The best one counts, and the questions come next. */
export function TriesUsedScreen({
  reading,
}: {
  reading: Extract<Reading, { status: 'tries_used' }>;
}) {
  const t = useTranslations('student');
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <Chip tone="mark" size="lg">
        {t('common.level', { level: reading.level })}
      </Chip>
      <h1 className="bb-s-title">{t('read.triesUsed.title', { count: reading.triesAllowed })}</h1>
      <p className="bb-s-lead">{t('read.triesUsed.body', { best: reading.bestTry })}</p>
      <TryList tries={reading.tries} label={t('read.triesUsed.listTitle')} />
      {reading.note ? (
        <Card emphasis="strong">
          <Eyebrow>{t('common.teacherSays')}</Eyebrow>
          <p className="bb-s-lead">{reading.note.text}</p>
        </Card>
      ) : null}
      <div className="bb-s-actions">
        <LinkButton href="/read/questions" icon={<ArrowRight size={22} />}>
          {t('read.triesUsed.answer')}
        </LinkButton>
      </div>
    </div>
  );
}
