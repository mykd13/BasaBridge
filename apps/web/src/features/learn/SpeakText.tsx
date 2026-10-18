'use client';

import { SpeakerButton } from '@basabridge/ui';
import { useEffect, useState } from 'react';

/**
 * Reads lesson text out loud with the browser's own voice. Nothing is sent anywhere. The
 * pre-generated audio and text-to-speech pipeline (BB-57) replaces this when it lands.
 */
export function speak(text: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function SpeakText({
  text,
  label,
  size = 'md',
}: {
  text: string;
  label: string;
  size?: 'md' | 'lg';
}) {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported('speechSynthesis' in window);
    return () => window.speechSynthesis?.cancel();
  }, []);

  return (
    <SpeakerButton
      label={label}
      size={size}
      playing={playing}
      disabled={!supported}
      onClick={() => {
        if (playing) {
          window.speechSynthesis.cancel();
          setPlaying(false);
        } else if (speak(text, () => setPlaying(false))) {
          setPlaying(true);
        }
      }}
    />
  );
}
