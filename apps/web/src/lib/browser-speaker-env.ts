import type { SpeakerEnv, TtsLang } from '@basabridge/speech';

const BROWSER_LOCALE: Record<TtsLang, string> = { en: 'en-US', fil: 'fil-PH' };

/** The real browser pieces behind the speaker controller. */
export function createBrowserSpeakerEnv(): SpeakerEnv {
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  const release = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };

  return {
    playUrl(url, onStart) {
      return new Promise<void>((resolve, reject) => {
        const el = new Audio(url);
        audio = el;
        el.onplaying = onStart;
        el.onended = () => resolve();
        el.onerror = () => reject(new Error('audio_failed'));
        el.play().catch(reject);
      });
    },
    async fetchServiceUrl(text, lang) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) throw new Error('tts_unavailable');
      release();
      objectUrl = URL.createObjectURL(await res.blob());
      return objectUrl;
    },
    speakBrowser(text, lang, onStart) {
      return new Promise<void>((resolve, reject) => {
        if (typeof speechSynthesis === 'undefined') return reject(new Error('no_voice'));
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = BROWSER_LOCALE[lang];
        utterance.onstart = onStart;
        utterance.onend = () => resolve();
        utterance.onerror = () => reject(new Error('no_voice'));
        speechSynthesis.speak(utterance);
      });
    },
    stopAll() {
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio = null;
      }
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },
  };
}
