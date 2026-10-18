'use client';

import { Button, Card, Chip, Eyebrow, Notice } from '@basabridge/ui';
import { Mic, MicOff, RotateCcw, Square } from '@basabridge/ui/icons';
import { newTryId } from '@basabridge/speech/capture';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { ReadingHelpText } from '@/components/reading-help/ReadingHelpText';
import { useMicrophone } from './use-microphone';
import { finishTryAction } from '@/server/student/actions';
import type { Reading } from '@/server/student/schemas';
import { LinkButton } from './common';
import './student.css';

type ReadyReading = Extract<Reading, { status: 'ready' }>;

const PROBLEM_KEYS = {
  denied: 'denied',
  blocked: 'blocked',
  'no-device': 'noDevice',
  unavailable: 'unavailable',
  unsupported: 'unsupported',
  lost: 'lost',
} as const;

function useElapsed(running: boolean): string {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function TryCard({ reading }: { reading: ReadyReading }) {
  const t = useTranslations('student.read.session');
  return (
    <Card>
      <Eyebrow>{t('tryEyebrow')}</Eyebrow>
      <p className="bb-s-big">
        {reading.triesAllowed === null
          ? t('tryOnly', { n: reading.tryNumber })
          : t('tryOf', { n: reading.tryNumber, total: reading.triesAllowed })}
      </p>
      <p className="bb-s-muted">
        {reading.triesAllowed === null
          ? t('triesRuleUnlimited', { level: reading.level })
          : t('triesRule', { level: reading.level, total: reading.triesAllowed })}
      </p>
    </Card>
  );
}

function Story({ reading }: { reading: ReadyReading }) {
  const t = useTranslations('student.read.session');
  return (
    <Card aria-label={t('story')}>
      <h2 className="bb-s-story-title">{reading.title}</h2>
      <ReadingHelpText>
        <p className="bb-s-story">{reading.text}</p>
      </ReadingHelpText>
    </Card>
  );
}

function LevelChip({ level }: { level: number }) {
  const t = useTranslations('student.common');
  return (
    <div className="bb-s-row">
      <Chip tone="mark" size="lg">
        {t('level', { level })}
      </Chip>
    </div>
  );
}

/**
 * The reading session (canvas B2, B3, D3). The server decides whether the microphone may be
 * used and which try this is. The browser only shows it and records when told to (rule 5).
 */
export function ReadSession({ reading }: { reading: ReadyReading }) {
  const t = useTranslations('student');
  const router = useRouter();
  const mic = useMicrophone();
  const [finishing, setFinishing] = useState<'idle' | 'sending' | 'failed'>('idle');
  const submitted = useRef(false);
  const elapsed = useElapsed(mic.phase === 'recording');

  const finish = async (tryId: string, mode: 'audio' | 'silent') => {
    setFinishing('sending');
    const result = await finishTryAction({ sessionId: reading.sessionId, tryId, mode });
    if (!result.ok) {
      submitted.current = false;
      setFinishing('failed');
      return;
    }
    router.push(result.data.next === 'questions' ? '/read/questions' : '/read/analysis');
  };

  const finishSilent = () => void finish(newTryId(), 'silent');
  const retryFinish = () => {
    if (mic.tryId) void finish(mic.tryId, 'audio');
  };
  const startAgain = () => {
    submitted.current = false;
    setFinishing('idle');
    void mic.restart();
  };

  // Once the last chunk is safely on the server, ask it to analyse the try.
  useEffect(() => {
    if (mic.phase === 'finished' && mic.upload === 'done' && mic.tryId && !submitted.current) {
      submitted.current = true;
      void finish(mic.tryId, 'audio');
    }
  }, [mic.phase, mic.upload, mic.tryId]);

  // The learner is not allowed the microphone yet: read silently.
  if (!reading.micAllowed) {
    return (
      <div className="bb-s-page">
        <LevelChip level={reading.level} />
        <h1 className="bb-s-title">{t('read.silent.title')}</h1>
        <Notice tone="warn">{t('read.silent.lead')}</Notice>
        <Story reading={reading} />
        {finishing === 'failed' ? (
          <Notice tone="bad" live="assertive">
            {t('read.upload.failed')}
          </Notice>
        ) : null}
        <div className="bb-s-actions">
          <Button
            disabled={finishing === 'sending'}
            aria-busy={finishing === 'sending'}
            onClick={finishSilent}
          >
            {t('read.silent.done')}
          </Button>
        </div>
      </div>
    );
  }

  if (mic.phase === 'recording' || mic.phase === 'finished') {
    const finished = mic.phase === 'finished';
    const uploadFailed = mic.upload === 'failed';
    const failed = uploadFailed || finishing === 'failed';
    const sent = mic.upload === 'done';
    const title = failed
      ? t('read.upload.failed')
      : !finished
        ? t('read.session.listening')
        : sent
          ? t('read.upload.analysing')
          : t('read.upload.sending');
    return (
      <div className="bb-s-page">
        <LevelChip level={reading.level} />
        <div className="bb-s-row">
          <h1 className="bb-s-title">
            {title}
            {!finished ? <span aria-hidden="true">{` ${elapsed}`}</span> : null}
          </h1>
          <Chip
            tone={finished ? 'warn' : 'accent'}
            icon={finished ? <MicOff size={18} /> : <Mic size={18} />}
          >
            {finished ? t('common.micOff') : t('read.mic.aria')}
          </Chip>
        </div>
        <div className="bb-s-split bb-s-split--2">
          <Story reading={reading} />
          <div className="bb-s-stack">
            <TryCard reading={reading} />
            <div
              className="bb-s-meter"
              role="meter"
              aria-label={t('read.session.meter')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(mic.level * 100)}
            >
              <div className="bb-s-meter__fill" style={{ transform: `scaleX(${mic.level})` }} />
            </div>
            <p className="bb-s-muted" aria-live="polite">
              {mic.upload === 'retrying' ? t('read.upload.slow') : ''}
            </p>
            <div className="bb-s-actions">
              {!finished ? (
                <>
                  <Button icon={<Square size={20} />} onClick={mic.stop}>
                    {t('read.session.finished')}
                  </Button>
                  <Button variant="secondary" onClick={mic.stop}>
                    {t('read.session.stopHere')}
                  </Button>
                </>
              ) : null}
              {finishing === 'failed' && mic.tryId ? (
                <Button onClick={retryFinish}>{t('read.problems.tryAgain')}</Button>
              ) : null}
              {finished && (failed || sent) ? (
                <Button variant="secondary" icon={<RotateCcw size={20} />} onClick={startAgain}>
                  {t('read.session.startAgain')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mic.phase in PROBLEM_KEYS) {
    const key = PROBLEM_KEYS[mic.phase as keyof typeof PROBLEM_KEYS];
    return (
      <div className="bb-s-page bb-s-page--narrow">
        <LevelChip level={reading.level} />
        <h1 className="bb-s-title">{t(`read.problems.${key}.title`)}</h1>
        <p className="bb-s-lead">{t(`read.problems.${key}.lead`)}</p>
        {key === 'blocked' ? (
          <ol className="bb-s-steps">
            <li>{t('read.problems.blocked.step1')}</li>
            <li>{t('read.problems.blocked.step2')}</li>
            <li>{t('read.problems.blocked.step3')}</li>
          </ol>
        ) : null}
        <Notice tone="warn">{t('read.problems.noMicNotice')}</Notice>
        <div className="bb-s-actions">
          <Button onClick={() => void mic.start()}>{t('read.problems.tryAgain')}</Button>
          <LinkButton href="/home" variant="secondary">
            {t('read.problems.back')}
          </LinkButton>
        </div>
      </div>
    );
  }

  const requesting = mic.phase === 'requesting';
  return (
    <div className="bb-s-page bb-s-page--narrow">
      <LevelChip level={reading.level} />
      <h1 className="bb-s-title">{t('read.mic.title')}</h1>
      <p className="bb-s-lead">{t('read.mic.lead')}</p>
      <Notice tone="warn">{t('read.mic.notice')}</Notice>
      <div className="bb-s-actions">
        <Button
          icon={<Mic size={22} />}
          onClick={() => void mic.start()}
          disabled={requesting}
          aria-busy={requesting}
        >
          {requesting ? t('read.mic.waiting') : t('read.mic.turnOn')}
        </Button>
        <Button variant="secondary" onClick={mic.noMicrophone} disabled={requesting}>
          {t('read.mic.cannot')}
        </Button>
      </div>
    </div>
  );
}
