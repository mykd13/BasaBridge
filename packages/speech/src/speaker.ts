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
  /** Stop whatever is playing. A pending playUrl or speakBrowser promise must settle (reject). */
  stopAll(): void;
  /**
   * Called synchronously inside the learner's tap, before any await, so browsers that only
   * allow sound during a gesture (iOS Safari) let later playback through.
   */
  prime?(): void;
}

export interface SpeakRequest {
  text: string;
  lang: TtsLang;
  /** Static file for a fixed sentence, when there is one. */
  fixedUrl?: string;
  /**
   * True when the first-screen autoplay started this run. Only then is a browser block read as
   * "wait for a tap". After a press, a block falls through to the next source and the error state.
   */
  autoplay?: boolean;
}

export interface Speaker {
  /** Call first thing in a tap handler, before any await. */
  prime(): void;
  play(request: SpeakRequest): Promise<void>;
  stop(): void;
}

/** The browser refused to play without a tap. Wait for the learner instead of trying other sources. */
function isBlockedByBrowser(error: unknown): boolean {
  return error instanceof Error && error.name === 'NotAllowedError';
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
      } catch (error) {
        if (request.autoplay && isBlockedByBrowser(error)) {
          // Blocked autoplay: do not spend a paid call or show an error. The button waits for a tap.
          if (current()) onState('idle');
          return;
        }
        // try the next source
      }
    }
    if (current()) onState('error');
  };

  return { prime: () => env.prime?.(), play, stop };
}
