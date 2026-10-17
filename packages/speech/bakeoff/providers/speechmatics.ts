/**
 * Speechmatics. Env: SPEECHMATICS_API_KEY, optional SPEECHMATICS_REGION (default eu1; us1 and
 * au1 also exist, none in Asia), SPEECHMATICS_OPERATING_POINT (default enhanced).
 * Retention: every batch job is deleted with DELETE /v2/jobs/{id}; no training unless opted in.
 * Biasing: additional_vocab, the passage cut into phrases of at most 6 words.
 * The batch path and multipart field names (data_file, config) are from memory and were not on
 * the reference page; check them with --limit 1 first. Docs checked 2026-10-17:
 * https://docs.speechmatics.com/speech-to-text/batch/output.md
 * https://docs.speechmatics.com/api-ref/realtime-transcription-websocket.md
 */
import { ensureOk, ProviderError } from '../log.ts';
import type { BakeoffOptions, BakeoffProvider, HeardWord, ProviderResult } from '../types.ts';
import type { Wav } from '../wav.ts';
import { passagePhrases } from './assemblyai.ts';
import { deleteOnVendor, openSocket, poll, requireEnv, streamPcm } from './common.ts';

interface SmResult {
  type: string;
  start_time: number;
  end_time: number;
  alternatives?: Array<{ content: string; confidence: number }>;
}

function toHeard(results: SmResult[]): HeardWord[] {
  return results
    .filter((r) => r.type === 'word' && r.alternatives?.[0])
    .map((r) => ({
      text: r.alternatives![0]!.content,
      start: r.start_time,
      end: r.end_time,
      confidence: r.alternatives![0]!.confidence,
    }));
}

export function createSpeechmatics(env: NodeJS.ProcessEnv): BakeoffProvider {
  const key = requireEnv(env, 'SPEECHMATICS_API_KEY');
  const region = env.SPEECHMATICS_REGION ?? 'eu1';
  const operatingPoint = env.SPEECHMATICS_OPERATING_POINT ?? 'enhanced';
  const base = `https://${region}.asr.api.speechmatics.com/v2`;
  const auth = { Authorization: `Bearer ${key}` };

  const transcriptionConfig = (options: BakeoffOptions) => ({
    language: 'en',
    operating_point: operatingPoint,
    ...(options.bias
      ? { additional_vocab: passagePhrases(options.referenceText).map((content) => ({ content })) }
      : {}),
  });

  const run = async (audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const signal = options.signal ?? null;
    const form = new FormData();
    form.append('data_file', audio, 'audio.wav');
    form.append(
      'config',
      JSON.stringify({ type: 'transcription', transcription_config: transcriptionConfig(options) }),
    );
    const create = await fetch(`${base}/jobs`, {
      method: 'POST',
      headers: auth,
      body: form,
      signal,
    });
    await ensureOk(create, 'speechmatics create');
    const { id } = (await create.json()) as { id: string };
    try {
      await poll(async () => {
        const r = await fetch(`${base}/jobs/${id}`, { headers: auth, signal });
        await ensureOk(r, 'speechmatics poll');
        const { job } = (await r.json()) as { job: { status: string } };
        if (job.status === 'rejected' || job.status === 'deleted')
          throw new ProviderError('job_error');
        return job.status === 'done' ? true : null;
      }, options.signal);
      const t = await fetch(`${base}/jobs/${id}/transcript?format=json-v2`, {
        headers: auth,
        signal,
      });
      await ensureOk(t, 'speechmatics transcript');
      const body = (await t.json()) as { results?: SmResult[] };
      return { words: toHeard(body.results ?? []) };
    } finally {
      await deleteOnVendor(`${base}/jobs/${id}`, auth);
    }
  };

  const runStream = async (wav: Wav, options: BakeoffOptions): Promise<ProviderResult> => {
    const rtRegion = region.replace(/\d+$/, '');
    const ws = await openSocket(`wss://${rtRegion}.rt.speechmatics.com/v2`, auth);
    const results: SmResult[] = [];
    let firstWordAt: number | null = null;
    let lastFinalAt = 0;
    let started!: () => void;
    const ready = new Promise<void>((r) => (started = r));
    const closed = new Promise<void>((resolve, reject) => {
      ws.addEventListener('message', (ev) => {
        if (typeof ev.data !== 'string') return;
        const msg = JSON.parse(ev.data) as { message?: string; results?: SmResult[] };
        if (msg.message === 'RecognitionStarted') started();
        if (msg.message === 'AddTranscript') {
          const got = msg.results ?? [];
          if (got.some((r) => r.type === 'word') && firstWordAt === null)
            firstWordAt = performance.now();
          lastFinalAt = performance.now();
          results.push(...got);
        }
        if (msg.message === 'EndOfTranscript') ws.close();
        if (msg.message === 'Error') reject(new ProviderError('rt_error'));
      });
      ws.addEventListener('close', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new ProviderError('ws_error')), { once: true });
      options.signal?.addEventListener('abort', () => ws.close(), { once: true });
    });
    // Rejections are read when awaited below; this stops Node treating them as unhandled.
    closed.catch(() => undefined);
    ws.send(
      JSON.stringify({
        message: 'StartRecognition',
        audio_format: { type: 'raw', encoding: 'pcm_s16le', sample_rate: wav.sampleRate },
        transcription_config: { ...transcriptionConfig(options), max_delay: 2 },
      }),
    );
    await Promise.race([
      ready,
      closed.then(() => {
        throw new ProviderError('closed_before_start');
      }),
    ]);
    let seq = 0;
    const { firstAt, lastAt } = await streamPcm(wav, (c) => {
      ws.send(c);
      seq++;
    });
    ws.send(JSON.stringify({ message: 'EndOfStream', last_seq_no: seq }));
    await closed;
    options.signal?.throwIfAborted();
    return {
      words: toHeard(results),
      ...(firstWordAt !== null ? { firstWordMs: firstWordAt - firstAt } : {}),
      finalAfterEndMs: Math.max(0, lastFinalAt - lastAt),
    };
  };

  return {
    name: 'speechmatics',
    biasing: 'additional_vocab (passage in phrases of 6 words or fewer)',
    streaming: true,
    modes: ['plain', 'biased'],
    hasWordConfidence: true,
    settings: {
      model: operatingPoint,
      locale: 'en',
      endpoint: `${region}.asr.api.speechmatics.com; ${region.replace(/\d+$/, '')}.rt.speechmatics.com`,
      region,
    },
    run,
    runStream,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}
