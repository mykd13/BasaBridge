'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createSpeaker,
  fixedAudioPath,
  type Speaker,
  type SpeakerState,
  type TtsLang,
} from '@basabridge/speech';
import { createBrowserSpeakerEnv } from '../lib/browser-speaker-env';

export interface SpokenEvent {
  /** True when the first-screen autoplay started the sound, false when the learner pressed the button. */
  autoplay: boolean;
}

export interface SpeakButtonProps {
  text: string;
  lang: TtsLang;
  /** Set true only for a fixed sentence that has a build-time audio file. */
  fixed?: boolean;
  /**
   * The first-screen autoplay. The caller decides from the learner's reading help setting:
   * on by default for the levels ADR 0004 names, and the learner can turn it off. The level
   * rule itself lives in packages/levels. Without this prop nothing plays until the button is pressed.
   */
  autoplay?: boolean;
  /**
   * Fires when sound actually starts. The caller sends it with the answer it affects, so the
   * server can record the accommodation (AGENTS.md rule 12). The browser only reports it.
   */
  onSpoken?: (event: SpokenEvent) => void;
  /** Text for the button, from the i18n catalog. */
  labels: { play: string; stop: string; error: string };
}

/** Plays, stops and shows state for one sentence. */
export function SpeakButton({
  text,
  lang,
  fixed = false,
  autoplay = false,
  onSpoken,
  labels,
}: SpeakButtonProps) {
  const [state, setState] = useState<SpeakerState>('idle');
  const speakerRef = useRef<Speaker | null>(null);
  const triggerRef = useRef<'autoplay' | 'button'>('button');
  const reportedRef = useRef(false);
  const onSpokenRef = useRef(onSpoken);
  onSpokenRef.current = onSpoken;

  // Created on mount so cleanup always stops the speaker that is playing.
  useEffect(() => {
    const speaker = createSpeaker(createBrowserSpeakerEnv(), (next) => {
      setState(next);
      // Once per run: a buffering pause can raise "playing" again, and the caller records each report.
      if (next === 'playing' && !reportedRef.current) {
        reportedRef.current = true;
        onSpokenRef.current?.({ autoplay: triggerRef.current === 'autoplay' });
      }
    });
    speakerRef.current = speaker;
    return () => {
      speaker.stop();
      speakerRef.current = null;
    };
  }, []);

  const start = async (trigger: 'autoplay' | 'button') => {
    const speaker = speakerRef.current;
    if (!speaker) return;
    triggerRef.current = trigger;
    reportedRef.current = false;
    // Before any await, so the tap still counts as a gesture.
    speaker.prime();
    let fixedUrl: string | undefined;
    if (fixed) {
      try {
        fixedUrl = await fixedAudioPath(text, lang);
      } catch {
        // No crypto on plain http. Fall through to the service and the browser voice.
      }
    }
    // The screen may have been left, or the speaker replaced, during the await.
    if (speakerRef.current !== speaker) return;
    await speaker.play({ text, lang, fixedUrl, autoplay: trigger === 'autoplay' });
  };

  useEffect(() => {
    if (autoplay) void start('autoplay');
    return () => speakerRef.current?.stop();
    // Autoplay runs once for this sentence; a new sentence is a new screen.
  }, [autoplay, text, lang]);

  const busy = state === 'loading' || state === 'playing';
  const label = state === 'error' ? labels.error : busy ? labels.stop : labels.play;

  return (
    <button
      type="button"
      onClick={() => (busy ? speakerRef.current?.stop() : void start('button'))}
      aria-label={label}
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
