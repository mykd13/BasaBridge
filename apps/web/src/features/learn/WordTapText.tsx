'use client';

import { speak } from './SpeakText';

/** A passage where each word can be tapped to hear it. Allowed in Learn (docs/PLAN.md 6.4). */
export function WordTapText({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <p className="bb-wordtap">
      {words.map((word, i) => (
        <span key={`${i}-${word}`}>
          <button
            type="button"
            className="bb-wordtap__word"
            onClick={() => speak(word.replace(/[^\p{L}\p{N}'-]/gu, ''))}
          >
            {word}
          </button>{' '}
        </span>
      ))}
    </p>
  );
}
