import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WordResult } from '@basabridge/contracts';
import { POST } from '../../app/api/learn/words/check/route';
import { startCapture } from './capture';
import { splitIntoChunks } from './chunks';
import { messagesFor } from './messages';
import { checkWord, parseWordCheck } from './check';
import { getFlaggedWords, pickFlaggedWords } from './flagged';
import { currentWord, initialState, reduce } from './session';

const word = (
  expected: string,
  outcome: WordResult['outcome'],
  extra: Partial<WordResult> = {},
): WordResult => ({
  expected,
  heard: null,
  outcome,
  confidence: 0.9,
  markedMisheard: false,
  ...extra,
});

describe('splitIntoChunks', () => {
  it('splits like the canvas example', () => {
    expect(splitIntoChunks('patient')).toEqual(['pa', 'tient']);
  });
  it('shares two consonants between chunks', () => {
    expect(splitIntoChunks('rabbit')).toEqual(['rab', 'bit']);
  });
  it('keeps one-chunk words whole and ignores a silent final e', () => {
    expect(splitIntoChunks('cat')).toEqual(['cat']);
    expect(splitIntoChunks('cake')).toEqual(['cake']);
  });
  it('joins back to the word and handles empty input', () => {
    expect(splitIntoChunks('Beautiful').join('')).toBe('beautiful');
    expect(splitIntoChunks('  ')).toEqual([]);
  });
});

describe('pickFlaggedWords', () => {
  const t = (iso: string, words: WordResult[]) => ({ at: new Date(iso), words });

  it('lists the most recent try first and each word once', () => {
    const out = pickFlaggedWords([
      t('2026-10-01', [word('old', 'omission'), word('again', 'substitution')]),
      t('2026-10-05', [word('new', 'substitution'), word('Again', 'omission')]),
    ]);
    expect(out).toEqual(['new', 'again', 'old']);
  });
  it('skips correct, misheard, low-value outcomes and insertions', () => {
    const out = pickFlaggedWords([
      t('2026-10-05', [
        word('fine', 'correct'),
        word('heard', 'substitution', { markedMisheard: true }),
        word('extra', 'insertion', { expected: null }),
        word('again', 'repetition'),
        word('kept', 'omission'),
      ]),
    ]);
    expect(out).toEqual(['kept']);
  });
  it('respects the limit', () => {
    const words = ['a', 'b', 'c'].map((w) => word(w, 'omission'));
    expect(pickFlaggedWords([t('2026-10-05', words)], 2)).toEqual(['a', 'b']);
  });
  it('starts empty with no real data', async () => {
    expect(await getFlaggedWords()).toEqual([]);
  });
});

describe('practice session', () => {
  const start = initialState(['patient', 'bridge']);

  it('praises only a clear match', () => {
    expect(reduce(start, { type: 'checked', result: 'match' }).phase).toBe('praised');
  });
  it('offers another go on anything else, never a failure state', () => {
    const s = reduce(start, { type: 'checked', result: 'no_match' });
    expect(s.phase).toBe('retry');
    expect(reduce(s, { type: 'record' }).phase).toBe('recording');
  });
  it('falls back to unscored when the check is unavailable or the mic is blocked', () => {
    for (const e of [
      { type: 'checked', result: 'unavailable' },
      { type: 'mic_blocked' },
    ] as const) {
      const s = reduce(start, e);
      expect(s).toMatchObject({ phase: 'unscored', unscored: true });
      expect(reduce(s, { type: 'record' })).toBe(s);
      expect(reduce(s, { type: 'next' }).phase).toBe('unscored');
    }
  });
  it('moves to the next word and stops at the last', () => {
    const s = reduce(reduce(start, { type: 'checked', result: 'match' }), { type: 'next' });
    expect(currentWord(s)).toBe('bridge');
    expect(s.phase).toBe('ready');
    expect(reduce(s, { type: 'next' })).toBe(s);
  });
});

describe('word check seam', () => {
  it('reports unavailable until the speech pipeline lands, and never throws', async () => {
    expect(await checkWord(new Blob(['x']), 'patient')).toBe('unavailable');
  });
  it('maps unknown values to unavailable', () => {
    expect(parseWordCheck('match')).toBe('match');
    expect(parseWordCheck('no_match')).toBe('no_match');
    expect(parseWordCheck('boom')).toBe('unavailable');
  });
});

describe('brand text', () => {
  it('is in every language and wording', () => {
    for (const lang of ['en', 'fil'] as const) {
      for (const wording of ['simple', 'standard'] as const) {
        expect(messagesFor(lang, wording).brand).toBe('BasaBridge');
      }
    }
  });
});

describe('startCapture', () => {
  function setup(opts: { recorderThrows?: boolean; startThrows?: boolean } = {}) {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
    const stream = { getTracks: () => tracks };
    class FakeRecorder {
      state: 'inactive' | 'recording' = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor() {
        if (opts.recorderThrows) throw new Error('unsupported');
      }
      start() {
        if (opts.startThrows) throw new Error('nope');
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['a']) });
        this.onstop?.();
      }
    }
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    return { tracks };
  }

  afterEach(() => vi.unstubAllGlobals());

  it('stops the microphone when the recorder constructor throws', async () => {
    const { tracks } = setup({ recorderThrows: true });
    expect(await startCapture(vi.fn())).toBeNull();
    tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });

  it('stops the microphone when start throws', async () => {
    const { tracks } = setup({ startThrows: true });
    expect(await startCapture(vi.fn())).toBeNull();
    tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });

  it('returns null when the microphone is blocked', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    vi.stubGlobal('MediaRecorder', class {});
    expect(await startCapture(vi.fn())).toBeNull();
  });

  it('hands over the audio and stops the tracks on stop', async () => {
    const { tracks } = setup();
    const onAudio = vi.fn();
    const capture = await startCapture(onAudio);
    capture?.stop();
    expect(onAudio).toHaveBeenCalledTimes(1);
    tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });

  it('stops the tracks and never calls back when cancelled mid-recording', async () => {
    const { tracks } = setup();
    const onAudio = vi.fn();
    const capture = await startCapture(onAudio);
    capture?.cancel();
    capture?.cancel();
    expect(onAudio).not.toHaveBeenCalled();
    tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });
});

describe('check route', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps no audio: nothing is logged and the answer carries no audio', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const body = new FormData();
    body.set('word', 'patient');
    body.set('audio', new Blob(['secret-audio-bytes']));
    const res = await POST(new Request('http://localhost/x', { method: 'POST', body }));
    const text = await res.text();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(JSON.parse(text)).toEqual({ result: 'unavailable' });
    expect(text).not.toContain('secret-audio-bytes');
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });

  it('rejects a missing recording', async () => {
    const body = new FormData();
    body.set('word', 'patient');
    const res = await POST(new Request('http://localhost/x', { method: 'POST', body }));
    expect(res.status).toBe(400);
  });
});
