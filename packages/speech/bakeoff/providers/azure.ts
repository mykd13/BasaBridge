/**
 * Azure AI Speech, two adapters. Env: AZURE_SPEECH_KEY, optional AZURE_SPEECH_REGION (default
 * southeastasia, Singapore). Microsoft states it does not store audio for real-time, fast
 * transcription or pronunciation assessment requests. Docs checked 2026-10-17.
 *
 * azure: fast transcription, locale AZURE_STT_LOCALE (default en-PH, which fast transcription
 *   supports). Biasing: phraseList with the passage sentences. Words have timings but no
 *   confidence, so each word gets its phrase's confidence.
 *   https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create
 *
 * azure-pa: pronunciation assessment with the passage as ReferenceText and miscue detection, on
 *   the short-audio REST path, which accepts at most 30 seconds. en-PH is not supported for
 *   assessment, so en-US is used. Word confidence is 0 in the response, so AccuracyScore / 100
 *   stands in for it. Streaming needs the Speech SDK and is not tested here.
 *   https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
 */
import { ensureOk } from '../log.ts';
import type {
  AssessedWord,
  BakeoffOptions,
  BakeoffProvider,
  HeardWord,
  ProviderResult,
} from '../types.ts';
import { requireEnv } from './common.ts';

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

export function createAzure(env: NodeJS.ProcessEnv): BakeoffProvider {
  const key = requireEnv(env, 'AZURE_SPEECH_KEY');
  const region = env.AZURE_SPEECH_REGION ?? 'southeastasia';
  const locale = env.AZURE_STT_LOCALE ?? 'en-PH';

  const run = async (audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const form = new FormData();
    form.append('audio', audio, 'audio.wav');
    form.append(
      'definition',
      JSON.stringify({
        locales: [locale],
        ...(options.bias ? { phraseList: { phrases: sentences(options.referenceText) } } : {}),
      }),
    );
    const res = await fetch(
      `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15`,
      {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key },
        body: form,
        signal: options.signal ?? null,
      },
    );
    await ensureOk(res, 'azure fast');
    const body = (await res.json()) as {
      phrases?: Array<{
        confidence?: number;
        words?: Array<{ text: string; offsetMilliseconds: number; durationMilliseconds: number }>;
      }>;
    };
    const words: HeardWord[] = (body.phrases ?? []).flatMap((p) =>
      (p.words ?? []).map((w) => ({
        text: w.text,
        start: w.offsetMilliseconds / 1000,
        end: (w.offsetMilliseconds + w.durationMilliseconds) / 1000,
        // Not scored: hasWordConfidence is false for this adapter.
        confidence: p.confidence ?? 0,
      })),
    );
    return { words };
  };

  return {
    name: 'azure',
    biasing: 'phraseList (passage sentences)',
    streaming: false,
    modes: ['plain', 'biased'],
    // Only phrase-level confidence exists; the report shows n/a rather than scoring it.
    hasWordConfidence: false,
    settings: {
      model: 'fast transcription 2025-10-15',
      locale,
      endpoint: `${region}.api.cognitive.microsoft.com`,
      region,
    },
    run,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}

interface PaWord {
  Word: string;
  Offset: number;
  Duration: number;
  AccuracyScore?: number;
  ErrorType?: string;
  PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
}

/** Split Azure's assessed words into heard words and one verdict per passage word. */
export function parseAssessment(words: PaWord[]): {
  words: HeardWord[];
  assessment: AssessedWord[];
} {
  const heard: HeardWord[] = [];
  const assessment: AssessedWord[] = [];
  for (const w of words) {
    const errorType = w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? 'None';
    const accuracy = w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore ?? 0;
    if (errorType !== 'Insertion') {
      assessment.push(
        errorType === 'Omission' || errorType === 'Mispronunciation' ? 'miscue' : 'ok',
      );
    }
    if (errorType !== 'Omission') {
      // Offset and Duration are in 100-nanosecond ticks.
      heard.push({
        text: w.Word,
        start: w.Offset / 1e7,
        end: (w.Offset + w.Duration) / 1e7,
        confidence: Math.min(1, Math.max(0, accuracy / 100)),
      });
    }
  }
  return { words: heard, assessment };
}

export function createAzurePronunciation(env: NodeJS.ProcessEnv): BakeoffProvider {
  const key = requireEnv(env, 'AZURE_SPEECH_KEY');
  const region = env.AZURE_SPEECH_REGION ?? 'southeastasia';

  const run = async (audio: Blob, options: BakeoffOptions): Promise<ProviderResult> => {
    const config = {
      ReferenceText: options.referenceText,
      GradingSystem: 'HundredMark',
      Granularity: 'Word',
      Dimension: 'Comprehensive',
      EnableMiscue: true,
    };
    const res = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': `audio/wav; codecs=audio/pcm; samplerate=${options.sampleRate ?? 16000}`,
          'Pronunciation-Assessment': Buffer.from(JSON.stringify(config)).toString('base64'),
          Accept: 'application/json',
        },
        body: audio,
        signal: options.signal ?? null,
      },
    );
    await ensureOk(res, 'azure pa');
    const body = (await res.json()) as { NBest?: Array<{ Words?: PaWord[] }> };
    return parseAssessment(body.NBest?.[0]?.Words ?? []);
  };

  return {
    name: 'azure-pa',
    biasing: 'ReferenceText (whole passage, built-in miscue detection)',
    streaming: false,
    modes: ['biased'],
    maxSeconds: 30,
    // Word confidence is 0 in responses; AccuracyScore is a pronunciation score, not confidence.
    hasWordConfidence: false,
    settings: {
      model: 'pronunciation assessment (short audio REST)',
      locale: 'en-US',
      endpoint: `${region}.stt.speech.microsoft.com`,
      region,
    },
    run,
    transcribe: async (audio, options) => (await run(audio, options)).words,
  };
}
