'use client';

import { SpeakerButton } from '@basabridge/ui';
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/i18n/types';
import { speakSentences } from '@/legal/speak';

export interface SpeakParagraphProps {
  /** The sentences of one paragraph, in order. Each one is a fixed catalog sentence. */
  sentences: string[];
  lang: Lang;
  listenLabel: string;
  stopLabel: string;
}

/**
 * The speaker button after a paragraph of the kids summary. It reads the paragraph's sentences
 * one after another with the browser's own voice, which is the fallback ADR 0005 names. When the
 * pre-generated audio from BB-57 is on main, play each sentence's audio file here and keep the
 * browser voice as the fallback. Nothing is sent anywhere from this button.
 */
export function SpeakParagraph({ sentences, lang, listenLabel, stopLabel }: SpeakParagraphProps) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSupported('speechSynthesis' in window);
    return () => stopRef.current?.();
  }, []);

  if (!supported) return null;

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  }

  function play() {
    setPlaying(true);
    stopRef.current = speakSentences(
      window.speechSynthesis,
      (text) => new SpeechSynthesisUtterance(text),
      sentences,
      lang,
      () => setPlaying(false),
    );
  }

  return (
    <SpeakerButton
      label={playing ? stopLabel : listenLabel}
      playing={playing}
      onClick={playing ? stop : play}
    />
  );
}
