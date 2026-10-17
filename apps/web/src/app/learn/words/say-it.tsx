'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import Link from 'next/link';
import { splitIntoChunks } from '../../../lib/word-practice/chunks';
import { parseWordCheck } from '../../../lib/word-practice/check';
import type { Messages } from '../../../lib/word-practice/messages';
import { currentWord, initialState, isLastWord, reduce } from '../../../lib/word-practice/session';
import styles from './say-it.module.css';

const RECORD_MS = 4000;

/**
 * Listen uses the browser voice for now. Swap this for the shared text-to-speech player
 * from BB-57 when it lands. Audio only starts after a tap.
 */
function speak(text: string, rate: number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

export function SayIt({ words, messages: t }: { words: string[]; messages: Messages }) {
  const [state, dispatch] = useReducer(reduce, words, initialState);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const word = currentWord(state);

  const stopRecording = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current && recorder.current.state === 'recording') recorder.current.stop();
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!word) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !window.MediaRecorder) {
      dispatch({ type: 'mic_blocked' });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      dispatch({ type: 'mic_blocked' });
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorder.current = rec;
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      dispatch({ type: 'checking' });
      // The recording only lives in memory for this one request and is never stored.
      const body = new FormData();
      body.set('word', word);
      body.set('audio', new Blob(chunks, { type: rec.mimeType }));
      chunks.length = 0;
      try {
        const res = await fetch('/api/learn/words/check', { method: 'POST', body });
        const json: unknown = await res.json();
        const result = parseWordCheck((json as { result?: unknown } | null)?.result);
        dispatch({ type: 'checked', result });
      } catch {
        dispatch({ type: 'checked', result: 'unavailable' });
      }
    };
    dispatch({ type: 'record' });
    rec.start();
    timer.current = setTimeout(stopRecording, RECORD_MS);
  }, [word, stopRecording]);

  if (!word) {
    return (
      <main className={styles.main}>
        <h1 className={styles.eyebrow}>{t.emptyTitle}</h1>
        <p className={styles.note}>{t.emptyBody}</p>
        <Link href="/learn" className={styles.primary}>
          {t.back}
        </Link>
      </main>
    );
  }

  const last = isLastWord(state);
  const praise = t.praise(word);
  const showNext = state.phase === 'praised' || (state.phase === 'unscored' && !last);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>BasaBridge</div>
        <div className={styles.headerRight}>
          <span className={styles.muted}>{t.progress(state.index + 1, words.length)}</span>
          <Link href="/learn" className={styles.leave}>
            {t.leave}
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <h1 className={styles.eyebrow}>{t.title}</h1>
        <div className={styles.word} lang="en">
          {word}
        </div>
        <div className={styles.chunks} lang="en" aria-hidden="true">
          {splitIntoChunks(word).map((chunk, i) => (
            <span key={`${chunk}-${i}`} className={styles.chunk}>
              {chunk}
            </span>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => speak(word, 0.9)}>
            {t.listen}
          </button>
          {state.phase === 'retry' && (
            <button type="button" className={styles.secondary} onClick={() => speak(word, 0.5)}>
              {t.listenSlowly}
            </button>
          )}
          {!state.unscored && state.phase !== 'praised' && (
            <button
              type="button"
              className={styles.primary}
              disabled={state.phase === 'checking'}
              onClick={state.phase === 'recording' ? stopRecording : startRecording}
            >
              {state.phase === 'recording' ? t.stop : t.sayIt}
            </button>
          )}
        </div>

        <div role="status" aria-live="polite" className={styles.status}>
          {state.phase === 'checking' && <span className={styles.muted}>{t.checking}</span>}
          {state.phase === 'praised' && (
            <div className={styles.praise}>
              <b>{praise.lead}</b> {praise.rest}
            </div>
          )}
          {state.phase === 'retry' && <div className={styles.retry}>{t.retry}</div>}
          {state.phase === 'unscored' && <div className={styles.retry}>{t.unscored}</div>}
        </div>

        {showNext && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => dispatch({ type: 'next' })}
          >
            {t.nextWord}
          </button>
        )}
        {state.phase === 'praised' && last && (
          <Link href="/learn" className={styles.primary}>
            {t.done}
          </Link>
        )}
        <p className={styles.note}>{t.note}</p>
      </main>
    </>
  );
}
