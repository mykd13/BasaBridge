import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMEOUT_MS,
  FakeSpeechProvider,
  SpeechError,
  createSpeechProvider,
  timeoutFromEnv,
  toSpeechError,
  withSpeechGuards,
  type HeardWord,
  type SpeechProvider,
} from './index';

const audio = new Blob([new Uint8Array(16)]);
const reference = 'The cat sat down.';

const provider = (fn: SpeechProvider['transcribe']): SpeechProvider => ({
  name: 'x',
  transcribe: fn,
});

describe('FakeSpeechProvider', () => {
  it('returns words with start, end and confidence', async () => {
    const words = await new FakeSpeechProvider().transcribe(audio, { referenceText: reference });
    expect(words.map((w) => w.text)).toEqual(['the', 'cat', 'sat', 'down']);
    expect(words[1]).toEqual({ text: 'cat', start: 0.5, end: 1, confidence: 0.95 });
  });

  it('receives the reference text and never reads the audio', async () => {
    const fake = new FakeSpeechProvider();
    await fake.transcribe(audio, { referenceText: reference });
    expect(fake.calls).toEqual([{ referenceText: reference, audioBytes: 16 }]);
    expect(fake.supportsBiasing).toBe(true);
  });

  it('can drop, substitute and lower confidence', async () => {
    const fake = new FakeSpeechProvider({
      drop: [0],
      substitute: { 1: 'cap' },
      lowConfidence: { 2: 0.2 },
    });
    const words = await fake.transcribe(audio, { referenceText: reference });
    expect(words.map((w) => w.text)).toEqual(['cap', 'sat', 'down']);
    expect(words[1]?.confidence).toBe(0.2);
  });
});

describe('toSpeechError', () => {
  it('maps status codes and unknown failures', () => {
    expect(toSpeechError({ status: 429 }).code).toBe('rate_limited');
    expect(toSpeechError({ status: 415 }).code).toBe('bad_audio');
    expect(toSpeechError(new Error('boom')).code).toBe('provider_unavailable');
  });
  it('keeps existing speech errors', () => {
    const e = new SpeechError('timeout');
    expect(toSpeechError(e)).toBe(e);
  });
  it('gives the UI a message and a retry hint', () => {
    const e = new SpeechError('empty_result');
    expect(e.messageKey).toBe('speech.error.empty_result');
    expect(e.retryable).toBe(true);
    expect(new SpeechError('not_configured').retryable).toBe(false);
  });
});

describe('withSpeechGuards', () => {
  const run = (p: SpeechProvider, opts?: { timeoutMs?: number }, signal?: AbortSignal) =>
    withSpeechGuards(p, opts).transcribe(audio, { referenceText: reference, signal });

  it('passes valid words and the reference through', async () => {
    const fake = new FakeSpeechProvider();
    expect(await run(fake)).toHaveLength(4);
    expect(fake.calls[0]?.referenceText).toBe(reference);
  });

  it('maps an empty result', async () => {
    await expect(run(new FakeSpeechProvider({ empty: true }))).rejects.toMatchObject({
      code: 'empty_result',
    });
  });

  it('maps a timeout', async () => {
    await expect(
      run(new FakeSpeechProvider({ delayMs: 200 }), { timeoutMs: 10 }),
    ).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('maps a caller abort', async () => {
    const c = new AbortController();
    const p = run(new FakeSpeechProvider({ delayMs: 200 }), undefined, c.signal);
    c.abort();
    await expect(p).rejects.toMatchObject({ code: 'aborted' });
  });

  it('times out a provider that ignores the signal and never settles', async () => {
    const hung = provider(() => new Promise<HeardWord[]>(() => {}));
    await expect(run(hung, { timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('aborts a provider that ignores the signal', async () => {
    const c = new AbortController();
    const p = run(
      provider(() => new Promise<HeardWord[]>(() => {})),
      undefined,
      c.signal,
    );
    c.abort();
    await expect(p).rejects.toMatchObject({ code: 'aborted' });
  });

  it('passes only the known options to the adapter', async () => {
    let seen: Record<string, unknown> = {};
    const spy = provider(async (_audio, options) => {
      seen = { ...options };
      return [{ text: 'a', start: 0, end: 1, confidence: 0.9 }];
    });
    await withSpeechGuards(spy).transcribe(audio, {
      referenceText: reference,
      learnerId: 'x',
    } as never);
    expect(Object.keys(seen).sort()).toEqual(['referenceText', 'signal']);
  });

  it('rejects a null word', async () => {
    const p = provider(async () => [null as unknown as HeardWord]);
    await expect(run(p)).rejects.toMatchObject({ code: 'provider_unavailable' });
  });

  it('treats rejected credentials as not configured', async () => {
    for (const status of [401, 403]) {
      const p = provider(async () => {
        throw Object.assign(new Error('x'), { status });
      });
      await expect(run(p)).rejects.toMatchObject({ code: 'not_configured', retryable: false });
    }
  });

  it('maps provider failures', async () => {
    const p = provider(async () => {
      throw Object.assign(new Error('x'), { status: 429 });
    });
    await expect(run(p)).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('rejects words with bad times or confidence', async () => {
    const bad: HeardWord[][] = [
      [{ text: 'a', start: 2, end: 1, confidence: 0.9 }],
      [{ text: 'a', start: 0, end: 1, confidence: 1.5 }],
      [{ text: 'a', start: -1, end: 1, confidence: 0.9 }],
    ];
    for (const words of bad) {
      await expect(run(provider(async () => words))).rejects.toMatchObject({
        code: 'provider_unavailable',
      });
    }
  });

  it('never puts the reference text or audio in error messages', async () => {
    const secret = 'sk-secret-key';
    const p = provider(async () => {
      throw Object.assign(new Error(`failed on ${reference} with ${secret}`), {
        status: 500,
        headers: { authorization: `Bearer ${secret}` },
      });
    });
    const err = (await run(p).catch((e: SpeechError) => e)) as SpeechError;
    expect(err).toBeInstanceOf(SpeechError);
    // The original error is dropped entirely, so nothing printed from the error chain can leak.
    expect(err.cause).toBeUndefined();
    const everything = [err.message, err.messageKey, err.stack ?? '', JSON.stringify(err)].join(
      ' ',
    );
    expect(everything).not.toContain(secret);
    expect(everything).not.toContain('cat sat');
  });
});

describe('createSpeechProvider', () => {
  it('builds the fake provider by name', async () => {
    const p = createSpeechProvider({ SPEECH_PROVIDER: ' Fake ' });
    expect(p.name).toBe('fake');
    expect(await p.transcribe(audio, { referenceText: reference })).toHaveLength(4);
  });

  it.each([{}, { SPEECH_PROVIDER: '' }, { SPEECH_PROVIDER: 'nope' }])(
    'is not configured for %j',
    (env) => {
      expect(() => createSpeechProvider(env)).toThrow(SpeechError);
      try {
        createSpeechProvider(env);
      } catch (e) {
        expect((e as SpeechError).code).toBe('not_configured');
      }
    },
  );

  it('refuses the fake provider in production', () => {
    expect(() => createSpeechProvider({ SPEECH_PROVIDER: 'fake', NODE_ENV: 'production' })).toThrow(
      SpeechError,
    );
    expect(() =>
      createSpeechProvider({ SPEECH_PROVIDER: 'fake', NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('does not resolve inherited property names', () => {
    expect(() => createSpeechProvider({ SPEECH_PROVIDER: 'constructor' })).toThrow(SpeechError);
    expect(() => createSpeechProvider({ SPEECH_PROVIDER: 'toString' })).toThrow(SpeechError);
  });
});

describe('timeoutFromEnv', () => {
  it('accepts values in range', () => {
    expect(timeoutFromEnv('5000')).toBe(5000);
  });
  it.each([undefined, '', 'abc', '-1', '5', '3000000000'])(
    'falls back to the default for %j',
    (v) => {
      expect(timeoutFromEnv(v)).toBe(DEFAULT_TIMEOUT_MS);
    },
  );
});
