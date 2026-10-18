import type { Lang } from '@/i18n/types';

export const VOICE_LANG: Record<Lang, string> = { en: 'en-US', fil: 'fil-PH' };

/** The parts of the browser's speech synthesis that reading a paragraph needs. */
export interface Synth {
  speak: (utterance: SpeechSynthesisUtterance) => void;
  cancel: () => void;
}

export type MakeUtterance = (text: string) => SpeechSynthesisUtterance;

/**
 * Queue the sentences of one paragraph, in order, in the language's voice. `onDone` runs once,
 * when the last sentence ends or fails. Returns a function that stops it without calling `onDone`.
 */
export function speakSentences(
  synth: Synth,
  make: MakeUtterance,
  sentences: string[],
  lang: Lang,
  onDone: () => void,
): () => void {
  let live = true;
  synth.cancel();
  const finish = () => {
    if (live) {
      live = false;
      onDone();
    }
  };
  sentences.forEach((sentence, index) => {
    const utterance = make(sentence);
    utterance.lang = VOICE_LANG[lang];
    if (index === sentences.length - 1) {
      utterance.onend = finish;
      utterance.onerror = finish;
    }
    synth.speak(utterance);
  });
  return () => {
    live = false;
    synth.cancel();
  };
}
