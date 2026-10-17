'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createSpeaker,
  fixedAudioPath,
  type Speaker,
  type SpeakerState,
  type TtsLang,
} from '@basabridge/speech';
import { createBrowserSpeakerEnv } from '../lib/browser-speaker-env';

export interface SpeakButtonProps {
  text: string;
  lang: TtsLang;
  /** Set true only for a fixed sentence that has a build-time audio file. */
  fixed?: boolean;
  /**
   * The first-screen autoplay. The caller passes true only when the learner has turned it on.
   * Without it, nothing plays until the learner presses the button.
   */
  autoplay?: boolean;
  /** Text for the button, from the i18n catalog. */
  labels: { play: string; stop: string; error: string };
}

/** Plays, stops and shows state for one sentence. */
export function SpeakButton({
  text,
  lang,
  fixed = false,
  autoplay = false,
  labels,
}: SpeakButtonProps) {
  const [state, setState] = useState<SpeakerState>('idle');
  const speakerRef = useRef<Speaker | null>(null);

  const speaker = useMemo(() => {
    const s = createSpeaker(createBrowserSpeakerEnv(), setState);
    speakerRef.current = s;
    return s;
  }, []);

  const start = async () => {
    await speaker.play({
      text,
      lang,
      fixedUrl: fixed ? await fixedAudioPath(text, lang) : undefined,
    });
  };

  useEffect(() => {
    if (autoplay) void start();
    return () => speakerRef.current?.stop();
    // Autoplay runs once for this sentence; a new sentence is a new screen.
  }, [autoplay, text, lang]);

  const busy = state === 'loading' || state === 'playing';
  const label = state === 'error' ? labels.error : busy ? labels.stop : labels.play;

  return (
    <button
      type="button"
      onClick={() => (busy ? speaker.stop() : void start())}
      aria-label={label}
      aria-pressed={busy}
      data-state={state}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: state === 'error' ? 'var(--bad-soft)' : 'var(--accent-soft)',
        color: state === 'error' ? 'var(--bad)' : 'var(--accent)',
        cursor: 'pointer',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {busy ? (
          <rect x="6" y="6" width="12" height="12" rx="2" />
        ) : (
          <path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
        )}
      </svg>
    </button>
  );
}
