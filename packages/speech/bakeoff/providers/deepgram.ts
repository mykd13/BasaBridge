/**
 * Deepgram Nova-3. Env: DEEPGRAM_API_KEY, optional DEEPGRAM_HOST (default api.deepgram.com, US;
 * api.eu, api.au and api.in also exist, none in Southeast Asia).
 * Zero retention: mip_opt_out=true on every request. Biasing: keyterm, one per unique passage
 * word (Deepgram caps keyterms at 500 tokens). Docs checked 2026-10-17:
 * https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
 * https://developers.deepgram.com/reference/speech-to-text/listen-streaming
 */
import { ensureOk, ProviderError } from '../log.ts';
import type { BakeoffOptions, BakeoffProvider, HeardWord, ProviderResult } from '../types.ts';
import type { Wav } from '../wav.ts';
import { openSocket, passageTerms, requireEnv, streamPcm } from './common.ts';

interface DgWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

function query(options: BakeoffOptions, extra: Record<string, string>): string {
  const q = new URLSearchParams({ model: 'nova-3', mip_opt_out: 'true', ...extra });
  if (options.bias)
    for (const t of passageTerms(options.referenceText, 100)) q.append('keyterm', t);
  return q.toString();
}

const toHeard = (w: DgWord): HeardWord => ({
  text: w.word,
  start: w.start,
  end: w.end,
  confidence: w.confidence,
});

export function createDeepgram(env: NodeJS.ProcessEnv): BakeoffProvider {
  const key = requireEnv(env, 'DEEPGRAM_API_KEY');
  const host = env.DEEPGRAM_HOST ?? 'api.deepgram.com';

  const run = async (audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const res = await fetch(`https://${host}/v1/listen?${query(options, {})}`, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': 'audio/wav' },
      body: audio,
      signal: options.signal ?? null,
    });
    await ensureOk(res, 'deepgram');
    const body = (await res.json()) as {
      results?: { channels?: Array<{ alternatives?: Array<{ words?: DgWord[] }> }> };
    };
    return { words: (body.results?.channels?.[0]?.alternatives?.[0]?.words ?? []).map(toHeard) };
  };

  const runStream = async (wav: Wav, options: BakeoffOptions): Promise<ProviderResult> => {
    const q = query(options, {
      encoding: 'linear16',
      sample_rate: String(wav.sampleRate),
      channels: '1',
      interim_results: 'false',
    });
    const ws = await openSocket(`wss://${host}/v1/listen?${q}`, { Authorization: `Token ${key}` });
    const words: HeardWord[] = [];
    let firstWordAt: number | null = null;
    let lastFinalAt = 0;
    const closed = new Promise<void>((resolve, reject) => {
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data !== 'string') return;
        const msg = JSON.parse(ev.data) as {
          type?: string;
          is_final?: boolean;
          channel?: { alternatives?: Array<{ words?: DgWord[] }> };
        };
        if (msg.type !== 'Results' || !msg.is_final) return;
        const got = msg.channel?.alternatives?.[0]?.words ?? [];
        if (got.length > 0 && firstWordAt === null) firstWordAt = performance.now();
        lastFinalAt = performance.now();
        words.push(...got.map(toHeard));
      });
      ws.addEventListener('close', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new ProviderError('ws_error')), { once: true });
      options.signal?.addEventListener('abort', () => ws.close(), { once: true });
    });
    // Rejections are read when awaited below; this stops Node treating them as unhandled.
    closed.catch(() => undefined);
    const { firstAt, lastAt } = await streamPcm(wav, (c) => ws.send(c));
    ws.send(JSON.stringify({ type: 'CloseStream' }));
    await closed;
    options.signal?.throwIfAborted();
    return {
      words,
      ...(firstWordAt !== null ? { firstWordMs: firstWordAt - firstAt } : {}),
      finalAfterEndMs: Math.max(0, lastFinalAt - lastAt),
    };
  };

  return {
    name: 'deepgram',
    biasing: 'keyterm (unique passage words)',
    streaming: true,
    modes: ['plain', 'biased'],
    run,
    runStream,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}
