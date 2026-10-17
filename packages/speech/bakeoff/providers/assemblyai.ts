/**
 * AssemblyAI. Env: ASSEMBLYAI_API_KEY, optional ASSEMBLYAI_HOST (default api.assemblyai.com, US;
 * api.eu.assemblyai.com for EU), ASSEMBLYAI_MODEL (default universal-3-5-pro),
 * ASSEMBLYAI_STREAM_MODEL (omitted by default, so the service default is used).
 * Retention: every batch transcript is deleted with DELETE /v2/transcript/{id}, which also
 * deletes the uploaded audio. Turn the model-training opt-out on in the dashboard before testing;
 * that also gives zero retention for streaming, and streaming refuses to start until
 * ASSEMBLYAI_TRAINING_OPT_OUT=confirmed. ASSEMBLYAI_STREAM_HOST overrides the streaming host,
 * which otherwise follows the batch data zone. Biasing: keyterms_prompt, the passage cut into
 * phrases of at most 6 words. Docs checked 2026-10-17:
 * https://www.assemblyai.com/docs/pre-recorded-audio/api-reference/transcripts/submit
 * https://www.assemblyai.com/docs/streaming/api-spec/streaming-websocket
 */
import { DataError } from '../data.ts';
import { ensureOk, ProviderError } from '../log.ts';
import type { BakeoffOptions, BakeoffProvider, HeardWord, ProviderResult } from '../types.ts';
import type { Wav } from '../wav.ts';
import {
  deleteOnVendor,
  noteDeleteFailure,
  openSocket,
  poll,
  requireEnv,
  streamPcm,
} from './common.ts';

interface AaiWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

/** The passage as phrases of at most six words, split at sentence ends first. */
export function passagePhrases(text: string, maxWords = 6): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = sentence
      .replace(/[.,!?;:]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    for (let i = 0; i < words.length; i += maxWords)
      out.push(words.slice(i, i + maxWords).join(' '));
  }
  return out;
}

const toHeard = (w: AaiWord): HeardWord => ({
  text: w.text,
  start: w.start / 1000,
  end: w.end / 1000,
  confidence: w.confidence,
});

export function createAssemblyAI(env: NodeJS.ProcessEnv): BakeoffProvider {
  const key = requireEnv(env, 'ASSEMBLYAI_API_KEY');
  const host = env.ASSEMBLYAI_HOST ?? 'api.assemblyai.com';
  const model = env.ASSEMBLYAI_MODEL ?? 'universal-3-5-pro';
  const base = `https://${host}/v2`;
  // Keep streaming in the same data zone as batch unless told otherwise.
  const streamHost =
    env.ASSEMBLYAI_STREAM_HOST ??
    (host.includes('.eu.') ? 'streaming.eu.assemblyai.com' : 'streaming.assemblyai.com');

  const run = async (audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const signal = options.signal ?? null;
    const up = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { authorization: key, 'Content-Type': 'application/octet-stream' },
      body: audio,
      signal,
    });
    await ensureOk(up, 'assemblyai upload');
    const { upload_url } = (await up.json()) as { upload_url: string };

    let id: string;
    try {
      const submit = await fetch(`${base}/transcript`, {
        method: 'POST',
        headers: { authorization: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: upload_url,
          speech_models: [model],
          language_code: 'en',
          ...(options.bias ? { keyterms_prompt: passagePhrases(options.referenceText) } : {}),
        }),
        signal,
      });
      await ensureOk(submit, 'assemblyai submit');
      ({ id } = (await submit.json()) as { id: string });
    } catch (err) {
      // The upload has no delete call of its own; AssemblyAI drops it after 24 to 48 hours.
      // Count it as a failed deletion so it shows up in the run summary.
      noteDeleteFailure();
      throw err;
    }

    try {
      const done = await poll(async () => {
        const r = await fetch(`${base}/transcript/${id}`, {
          headers: { authorization: key },
          signal,
        });
        await ensureOk(r, 'assemblyai poll');
        const t = (await r.json()) as { status: string; words?: AaiWord[] };
        if (t.status === 'error') throw new ProviderError('job_error');
        return t.status === 'completed' ? t : null;
      }, options.signal);
      return { words: (done.words ?? []).map(toHeard) };
    } finally {
      // Delete even when polling failed, so nothing is left on their side. This also deletes
      // the uploaded audio.
      await deleteOnVendor(`${base}/transcript/${id}`, { authorization: key });
    }
  };

  const runStream = async (wav: Wav, options: BakeoffOptions): Promise<ProviderResult> => {
    // Streaming has no delete call. Zero retention depends on the dashboard training opt-out,
    // which the API cannot check, so the person running the bake-off must confirm it.
    if (env.ASSEMBLYAI_TRAINING_OPT_OUT !== 'confirmed') {
      throw new DataError(
        'Turn on the training opt-out in the AssemblyAI dashboard, then set ASSEMBLYAI_TRAINING_OPT_OUT=confirmed.',
      );
    }
    const q = new URLSearchParams({ sample_rate: String(wav.sampleRate), encoding: 'pcm_s16le' });
    if (env.ASSEMBLYAI_STREAM_MODEL) q.set('speech_model', env.ASSEMBLYAI_STREAM_MODEL);
    if (options.bias) {
      q.set('keyterms_prompt', JSON.stringify(passagePhrases(options.referenceText).slice(0, 100)));
    }
    const ws = await openSocket(`wss://${streamHost}/v3/ws?${q}`, {
      authorization: key,
    });
    const turns = new Map<number, AaiWord[]>();
    let firstWordAt: number | null = null;
    let lastFinalAt = 0;
    const closed = new Promise<void>((resolve, reject) => {
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data !== 'string') return;
        const msg = JSON.parse(ev.data) as {
          type?: string;
          turn_order?: number;
          end_of_turn?: boolean;
          words?: Array<AaiWord & { word_is_final?: boolean }>;
        };
        if (msg.type !== 'Turn') return;
        if ((msg.words ?? []).length > 0 && firstWordAt === null) firstWordAt = performance.now();
        if (msg.end_of_turn) {
          turns.set(msg.turn_order ?? turns.size, msg.words ?? []);
          lastFinalAt = performance.now();
        }
      });
      ws.addEventListener('close', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new ProviderError('ws_error')), { once: true });
      options.signal?.addEventListener('abort', () => ws.close(), { once: true });
    });
    // Rejections are read when awaited below; this stops Node treating them as unhandled.
    closed.catch(() => undefined);
    const { firstAt, lastAt } = await streamPcm(wav, (c) => ws.send(c));
    ws.send(JSON.stringify({ type: 'Terminate' }));
    await closed;
    options.signal?.throwIfAborted();
    const words = [...turns.entries()]
      .sort((a, b) => a[0] - b[0])
      .flatMap(([, w]) => w.map(toHeard));
    return {
      words,
      ...(firstWordAt !== null ? { firstWordMs: firstWordAt - firstAt } : {}),
      finalAfterEndMs: Math.max(0, lastFinalAt - lastAt),
    };
  };

  return {
    name: 'assemblyai',
    biasing: 'keyterms_prompt (passage in phrases of 6 words or fewer)',
    streaming: true,
    modes: ['plain', 'biased'],
    hasWordConfidence: true,
    settings: {
      model: `${model}; stream ${env.ASSEMBLYAI_STREAM_MODEL ?? 'service default'}`,
      locale: 'en',
      endpoint: `${host}; ${streamHost}`,
      region: host.includes('.eu.') ? 'EU' : 'US',
    },
    run,
    runStream,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}
