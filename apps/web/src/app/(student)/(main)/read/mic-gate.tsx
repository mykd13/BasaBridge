'use client';

import Link from 'next/link';
import { copy, type ProblemKey } from './copy';
import styles from './read.module.css';
import { useMicrophone } from './use-microphone';

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="var(--accent)" />
      <path
        d="M5 27h30M8 27c0-8 5-12 12-12s12 4 12 12M14 27v-6M20 27v-12M26 27v-6"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 52 52" role="img" aria-label={copy.micAria}>
      <rect x="18" y="5" width="16" height="28" rx="8" fill="var(--accent)" />
      <path
        d="M10 25c0 9 7 15 16 15s16-6 16-15M26 40v8M18 48h16"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logo />
          {copy.brand}
        </div>
      </header>
      {children}
    </>
  );
}

const PROBLEMS: readonly string[] = [
  'denied',
  'blocked',
  'no-device',
  'unavailable',
  'unsupported',
  'lost',
];

/** Canvas B2 (turn on microphone) and D3 (microphone blocked), plus the live capture panel. */
export function MicGate() {
  const mic = useMicrophone();

  if (mic.phase === 'recording' || mic.phase === 'finished') {
    const finished = mic.phase === 'finished';
    const failed = mic.upload === 'failed';
    const sent = mic.upload === 'done';
    const title = !finished ? copy.recording.title : sent ? copy.upload.done : copy.upload.sending;
    const status = failed ? copy.upload.failed : mic.upload === 'retrying' ? copy.upload.slow : '';
    return (
      <Shell>
        <main className={styles.main}>
          <section className={styles.copy}>
            <h1 className={styles.title}>{failed ? copy.upload.failed : title}</h1>
            <div
              className={styles.meter}
              role="meter"
              aria-label={copy.meterAria}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(mic.level * 100)}
            >
              <div className={styles.meterFill} style={{ transform: `scaleX(${mic.level})` }} />
            </div>
            <p className={styles.status} aria-live="polite">
              {failed ? '' : status}
            </p>
            <div className={styles.actions}>
              {!finished ? (
                <button className={styles.primary} onClick={mic.stop}>
                  {copy.recording.stop}
                </button>
              ) : null}
              {/* Starting again while a take is still sending would throw that take away. */}
              <button
                className={finished ? styles.primary : styles.secondary}
                onClick={mic.restart}
                disabled={finished && !sent && !failed}
              >
                {copy.recording.startAgain}
              </button>
            </div>
          </section>
        </main>
      </Shell>
    );
  }

  if (PROBLEMS.includes(mic.phase)) {
    const problem = copy.problems[mic.phase as ProblemKey];
    return (
      <Shell>
        <main className={`${styles.main} ${styles.column}`}>
          <h1 className={styles.title}>{problem.title}</h1>
          <p className={styles.lead}>{problem.lead}</p>
          {problem.steps.length > 0 ? (
            <ol className={styles.steps}>
              {problem.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          <div className={styles.notice}>{copy.noMicNotice}</div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={mic.start}>
              {copy.tryAgain}
            </button>
            <Link href="/" className={styles.secondary}>
              {copy.back}
            </Link>
          </div>
        </main>
      </Shell>
    );
  }

  const requesting = mic.phase === 'requesting';
  return (
    <Shell>
      <main className={styles.main}>
        <section className={styles.copy}>
          <h1 className={styles.title}>{copy.ready.title}</h1>
          <p className={styles.lead}>{copy.ready.lead}</p>
          <div className={styles.notice}>{copy.ready.notice}</div>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              onClick={mic.start}
              disabled={requesting}
              aria-busy={requesting}
            >
              {requesting ? copy.ready.waiting : copy.ready.turnOn}
            </button>
            <button className={styles.secondary} onClick={mic.noMicrophone} disabled={requesting}>
              {copy.ready.cannot}
            </button>
          </div>
        </section>
        <div className={styles.art}>
          <div className={styles.disc}>
            <MicIcon />
          </div>
        </div>
      </main>
    </Shell>
  );
}
