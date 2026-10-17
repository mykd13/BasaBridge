export const dynamic = 'force-dynamic';

/** One chunk is about a second of audio. Anything bigger is not from our recorder. */
const MAX_CHUNK_BYTES = 1_000_000;
const TRY_ID = /^[A-Za-z0-9_-]{8,64}$/;
const INDEX = /^\d{1,9}$/;
/** What MediaRecorder produces. The final marker has no body and no type, so octet-stream is allowed too. */
const ALLOWED_TYPES = new Set(['audio/webm', 'audio/mp4', 'audio/ogg', 'application/octet-stream']);

const bad = (error: string, status: number) => Response.json({ error }, { status });

/** Read the body without ever holding more than the cap. Returns null when it is too big. */
async function readCapped(request: Request): Promise<number | null> {
  if (!request.body) return 0;
  const reader = request.body.getReader();
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return total;
    total += value.byteLength;
    if (total > MAX_CHUNK_BYTES) {
      await reader.cancel();
      return null;
    }
  }
}

/**
 * Receives audio chunks for one try (BB-23).
 * For now it only validates and acknowledges. It keeps no audio and logs none. Do not store or forward
 * audio here until all three of these land: authorization with a learner ownership check (BB-10),
 * the under-13 microphone gate (server side), and an Origin check. The server-issued try (BB-24)
 * must exist too. None of them are in place yet.
 * It answers with the next index it expects so the browser can resume after a dropped connection.
 */
export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const tryId = request.headers.get('x-bb-try') ?? '';
  const rawIndex = params.get('index') ?? '';
  if (!TRY_ID.test(tryId) || !INDEX.test(rawIndex)) return bad('bad_request', 400);

  const type = (request.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
  if (!ALLOWED_TYPES.has(type)) return bad('unsupported_type', 415);

  const size = await readCapped(request);
  if (size === null) return bad('too_large', 413);

  return Response.json({ next: Number(rawIndex) + 1 });
}
