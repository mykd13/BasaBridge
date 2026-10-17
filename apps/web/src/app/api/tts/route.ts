import { speakCached, type TtsLang } from '@basabridge/speech';
import { allowRequest, clientKey } from '../../../lib/rate-limit';
import { getTtsProvider, ttsCache, ttsCostPerMillionChars } from '../../../lib/tts';

export const dynamic = 'force-dynamic';

const MAX_CHARS = 600;
const PROVIDER_TIMEOUT_MS = 10_000;

/**
 * On-demand speech for questions, options and notes. Returns 503 when the service is not
 * available, and the browser then speaks with its own voice. Logs carry the language,
 * character count, cost and failure status only, never the text.
 *
 * This route takes raw text, so the callers decide what is sent. Once the authorization layer
 * (BB-10) exists it should take an id, look the text up there and check the caller may hear it.
 */
export async function POST(request: Request) {
  if (!allowRequest(clientKey(request))) {
    return Response.json({ error: 'rate_limited' }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { text, lang } = (body ?? {}) as { text?: unknown; lang?: unknown };
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHARS) {
    return Response.json({ error: 'invalid_text' }, { status: 400 });
  }
  if (lang !== 'en' && lang !== 'fil') {
    return Response.json({ error: 'invalid_lang' }, { status: 400 });
  }
  const provider = getTtsProvider();
  if (!provider) return Response.json({ error: 'unavailable' }, { status: 503 });

  try {
    const audio = await speakCached(text, lang as TtsLang, {
      provider,
      cache: ttsCache,
      costPerMillionChars: ttsCostPerMillionChars(),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      onCost: (event) => console.info(JSON.stringify({ event: 'tts_cost', ...event })),
    });
    return new Response(audio.bytes as BodyInit, {
      headers: { 'Content-Type': audio.contentType },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = /status (\d{3})/.exec(message)?.[1];
    console.error(
      JSON.stringify({
        event: 'tts_error',
        provider: provider.name,
        lang,
        status: status ? Number(status) : undefined,
        reason: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'failed',
      }),
    );
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
}
