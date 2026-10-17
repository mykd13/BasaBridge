/**
 * Playback controller for interface audio (ADR 0004, BB-57). No framework code here.
 * Order: the fixed audio file, then the on-demand service, then the browser's own voice.
 * Nothing plays until play() is called, and the caller only calls it after a learner action
 * (or the first-screen autoplay the learner turned on).
 */
import type { TtsLang } from './tts';

export type SpeakerState = 'idle' | 'loading' | 'playing' | 'error';

/** The browser pieces, injected so the logic can be tested without a browser. */
export interface SpeakerEnv {
  /** Play a URL. Call onStart when sound begins. Resolve at the end, reject on any failure. */
  playUrl(url: string, onStart: () => void): Promise<void>;
  /** Ask the service for audio. Resolve with a playable URL, reject when it is unavailable. */
  fetchServiceUrl(text: string, lang: TtsLang): Promise<string>;
  /** Speak with the browser's voice. Reject when there is none. */
  speakBrowser(text: string, lang: TtsLang, onStart: () => void): Promise<void>;
  /** Stop whatever is playing. */
  stopAll(): void;
}

export interface SpeakRequest {
  text: string;
  lang: TtsLang;
  /** Static file for a fixed sentence, when there is one. */
  fixedUrl?: string;
}

export interface Speaker {
  play(request: SpeakRequest): Promise<void>;
  stop(): void;
}

export function createSpeaker(env: SpeakerEnv, onState: (state: SpeakerState) => void): Speaker {
  let run = 0;

  const stop = () => {
    run += 1;
    env.stopAll();
    onState('idle');
  };

  const play = async (request: SpeakRequest) => {
    env.stopAll();
    const mine = ++run;
    const current = () => mine === run;
    onState('loading');
    const started = () => {
      if (current()) onState('playing');
    };

    const attempts: Array<() => Promise<void>> = [];
    if (request.fixedUrl) {
      const url = request.fixedUrl;
      attempts.push(() => env.playUrl(url, started));
    }
    attempts.push(async () => {
      const url = await env.fetchServiceUrl(request.text, request.lang);
      if (!current()) return;
      await env.playUrl(url, started);
    });
    attempts.push(() => env.speakBrowser(request.text, request.lang, started));

    for (const attempt of attempts) {
      if (!current()) return;
      try {
        await attempt();
        if (current()) onState('idle');
        return;
      } catch {
        // try the next source
      }
    }
    if (current()) onState('error');
  };

  return { play, stop };
}
