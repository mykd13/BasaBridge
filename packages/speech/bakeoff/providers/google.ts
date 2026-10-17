/**
 * Google Cloud Speech-to-Text v2, Chirp 3, batch only. Env: GOOGLE_ACCESS_TOKEN (for example from
 * `gcloud auth print-access-token`, valid for an hour), GOOGLE_PROJECT, optional GOOGLE_LOCATION
 * (default us; Chirp 3 is GA in us and eu, Singapore is unverified) and GOOGLE_LANGUAGE
 * (default en-US; en-PH is in preview for Chirp 3).
 * Data logging is opt-in and off by default. Synchronous recognize takes at most one minute of
 * audio. Streaming is gRPC only, so it is not tested here. Word confidence on Chirp 3 "isn't
 * truly a confidence score", so treat its confidence numbers with care. Biasing: an inline
 * phrase set of passage phrases. Docs checked 2026-10-17:
 * https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3
 */
import { ensureOk } from '../log.ts';
import type { BakeoffOptions, BakeoffProvider, HeardWord, ProviderResult } from '../types.ts';
import { passagePhrases } from './assemblyai.ts';
import { requireEnv } from './common.ts';

const seconds = (d: string | undefined) => (d ? Number(d.replace(/s$/, '')) : 0);

export function createGoogle(env: NodeJS.ProcessEnv): BakeoffProvider {
  const token = requireEnv(env, 'GOOGLE_ACCESS_TOKEN');
  const project = requireEnv(env, 'GOOGLE_PROJECT');
  const location = env.GOOGLE_LOCATION ?? 'us';
  const language = env.GOOGLE_LANGUAGE ?? 'en-US';

  const run = async (audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const content = Buffer.from(await audio.arrayBuffer()).toString('base64');
    const config = {
      model: 'chirp_3',
      languageCodes: [language],
      autoDecodingConfig: {},
      features: { enableWordTimeOffsets: true, enableWordConfidence: true },
      ...(options.bias
        ? {
            adaptation: {
              phraseSets: [
                {
                  inlinePhraseSet: {
                    phrases: passagePhrases(options.referenceText).map((value) => ({
                      value,
                      boost: 10,
                    })),
                  },
                },
              ],
            },
          }
        : {}),
    };
    const res = await fetch(
      `https://${location}-speech.googleapis.com/v2/projects/${project}/locations/${location}/recognizers/_:recognize`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, content }),
        signal: options.signal ?? null,
      },
    );
    await ensureOk(res, 'google');
    const body = (await res.json()) as {
      results?: Array<{
        alternatives?: Array<{
          words?: Array<{
            word: string;
            startOffset?: string;
            endOffset?: string;
            confidence?: number;
          }>;
        }>;
      }>;
    };
    const words: HeardWord[] = (body.results ?? []).flatMap((r) =>
      (r.alternatives?.[0]?.words ?? []).map((w) => ({
        text: w.word,
        start: seconds(w.startOffset),
        end: seconds(w.endOffset),
        confidence: w.confidence ?? 0,
      })),
    );
    return { words };
  };

  return {
    name: 'google',
    biasing: 'adaptation inline phrase set (passage phrases, boost 10)',
    streaming: false,
    modes: ['plain', 'biased'],
    maxSeconds: 60,
    // Google documents Chirp 3 word confidence as not a true confidence score.
    hasWordConfidence: false,
    settings: {
      model: 'chirp_3',
      locale: language,
      endpoint: `${location}-speech.googleapis.com`,
      region: location,
    },
    run,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}
