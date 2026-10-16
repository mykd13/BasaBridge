'use client';

import Link from 'next/link';
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
    <svg width="96" height="96" viewBox="0 0 52 52" role="img" aria-label="Microphone">
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
          BasaBridge
        </div>
      </header>
      {children}
    </>
  );
}

/** Canvas B2 (turn on microphone) and D3 (microphone blocked), plus the live capture panel. */
export function MicGate() {
  const mic = useMicrophone();

  if (mic.phase === 'recording' || mic.phase === 'finished') {
    return (
      <Shell>
        <main className={styles.main}>
          <section className={styles.copy}>
            <h1 className={styles.title}>{mic.phase === 'recording' ? 'Listening' : 'All done'}</h1>
            <div
              className={styles.meter}
              role="meter"
              aria-label="Microphone level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(mic.level * 100)}
            >
              <div className={styles.meterFill} style={{ transform: `scaleX(${mic.level})` }} />
            </div>
            <p className={styles.status} aria-live="polite">
              {mic.upload === 'retrying' ? 'Connection is slow. Still trying.' : ''}
              {mic.upload === 'failed' ? 'Your reading could not be sent. Please try again.' : ''}
            </p>
            <div className={styles.actions}>
              {mic.phase === 'recording' ? (
                <button className={styles.primary} onClick={mic.stop}>
                  Stop
                </button>
              ) : null}
              <button
                className={mic.phase === 'recording' ? styles.secondary : styles.primary}
                onClick={mic.restart}
              >
                Start again
              </button>
            </div>
          </section>
        </main>
      </Shell>
    );
  }

  if (
    mic.phase === 'denied' ||
    mic.phase === 'blocked' ||
    mic.phase === 'no-device' ||
    mic.phase === 'unavailable' ||
    mic.phase === 'unsupported'
  ) {
    const noMic = mic.phase === 'no-device' || mic.phase === 'unsupported';
    return (
      <Shell>
        <main
          className={styles.main}
          style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: 880 }}
        >
          <h1 className={styles.title}>
            {noMic ? 'No microphone found' : 'The microphone is turned off'}
          </h1>
          <p className={styles.lead}>
            {noMic
              ? 'Your teacher needs to hear you read. Plug in a microphone, then try again.'
              : 'Your teacher needs to hear you read. Turn the microphone on for this website, then try again.'}
          </p>
          {noMic ? null : (
            <ol className={styles.steps}>
              <li>Click the lock or settings icon next to the web address.</li>
              <li>Find Microphone and choose Allow.</li>
              <li>Come back here and press Try again.</li>
            </ol>
          )}
          <div className={styles.notice}>
            No microphone on this computer? You can still read stories and answer questions, but
            reading aloud and the AI reading analysis need a microphone.
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={mic.start}>
              Try again
            </button>
            <Link href="/" className={styles.secondary}>
              Back
            </Link>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className={styles.main}>
        <section className={styles.copy}>
          <h1 className={styles.title}>Read the story out loud</h1>
          <p className={styles.lead}>
            Your teacher will listen while you read. Press the button, then choose Allow when your
            browser asks about the microphone.
          </p>
          <div className={styles.notice}>
            Find a quiet spot. Read at your own speed. Your voice is used to follow along and is not
            kept.
          </div>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={mic.start}>
              Turn on microphone
            </button>
            <button className={styles.secondary} onClick={mic.noMicrophone}>
              I cannot use a microphone
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
