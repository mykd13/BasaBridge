import { speakCached, type TtsLang } from '@basabridge/speech';
import { getTtsProvider, ttsCache, ttsCostPerMillionChars } from '../../../lib/tts';

export const dynamic = 'force-dynamic';

const MAX_CHARS = 600;

/**
 * On-demand speech for questions, options and notes. Returns 503 when the service is not
 * available, and the browser then speaks with its own voice. The log line has the language,
 * character count and cost only, never the text.
 */
export async function POST(request: Request) {
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
      onCost: (event) => console.info(JSON.stringify({ event: 'tts_cost', ...event })),
    });
    return new Response(audio.bytes as BodyInit, {
      headers: {
        'Content-Type': audio.contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }
}
