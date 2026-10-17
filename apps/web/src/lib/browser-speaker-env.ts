import type { SpeakerEnv, TtsLang } from '@basabridge/speech';

const BROWSER_LOCALE: Record<TtsLang, string> = { en: 'en-US', fil: 'fil-PH' };
/** Language prefixes a browser may use for Filipino voices. */
const VOICE_PREFIXES: Record<TtsLang, string[]> = { en: ['en'], fil: ['fil', 'tl'] };
const START_TIMEOUT_MS = 4000;
/** A silent clip, played inside the tap so the shared element is allowed to play later. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

/** The real browser pieces behind the speaker controller. One audio element is reused. */
export function createBrowserSpeakerEnv(): SpeakerEnv {
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;
  let cancel: (() => void) | null = null;

  const element = () => (audio ??= new Audio());

  const release = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };

  const hasVoice = (lang: TtsLang) => {
    const voices = speechSynthesis.getVoices();
    // Some browsers load voices late. An empty list is unknown, so try and let the timeout decide.
    if (voices.length === 0) return true;
    return voices.some((v) => VOICE_PREFIXES[lang].some((p) => v.lang.toLowerCase().startsWith(p)));
  };

  return {
    prime() {
      const el = element();
      el.src = SILENT_WAV;
      el.play().catch(() => {});
    },
    playUrl(url, onStart) {
      return new Promise<void>((resolve, reject) => {
        const el = element();
        cancel = () => reject(new Error('stopped'));
        el.onplaying = onStart;
        el.onended = () => resolve();
        el.onerror = () => reject(new Error('audio_failed'));
        el.src = url;
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
        if (typeof speechSynthesis === 'undefined' || !hasVoice(lang)) {
          return reject(new Error('no_voice'));
        }
        let started = false;
        const timer = setTimeout(() => {
          if (started) return;
          speechSynthesis.cancel();
          reject(new Error('no_voice'));
        }, START_TIMEOUT_MS);
        cancel = () => {
          clearTimeout(timer);
          reject(new Error('stopped'));
        };
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = BROWSER_LOCALE[lang];
        utterance.onstart = () => {
          started = true;
          clearTimeout(timer);
          onStart();
        };
        utterance.onend = () => {
          clearTimeout(timer);
          resolve();
        };
        utterance.onerror = () => {
          clearTimeout(timer);
          reject(new Error('no_voice'));
        };
        speechSynthesis.speak(utterance);
      });
    },
    stopAll() {
      // Settle any pending promise first, so a stopped run never leaks.
      const pending = cancel;
      cancel = null;
      pending?.();
      if (audio) {
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      }
      release();
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    },
  };
}
