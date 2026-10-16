export const dynamic = 'force-dynamic';

/** One chunk is about a second of audio. Anything bigger is not from our recorder. */
const MAX_CHUNK_BYTES = 1_000_000;
const TRY_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Receives audio chunks for one try (BB-23).
 * For now it only validates and acknowledges. It keeps no audio and logs none: storage and
 * hand-off to the speech provider arrive with BB-24, and the try ownership check with the
 * authorization layer (BB-10). It answers with the next index it expects so the browser can
 * resume after a dropped connection.
 */
export async function POST(request: Request) {
  const params = new URL(request.url).searchParams;
  const tryId = params.get('try') ?? '';
  const index = Number(params.get('index'));
  if (!TRY_ID.test(tryId) || !Number.isInteger(index) || index < 0) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_CHUNK_BYTES) {
    return Response.json({ error: 'too_large' }, { status: 413 });
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_CHUNK_BYTES) {
    return Response.json({ error: 'too_large' }, { status: 413 });
  }

  const final = params.get('final') === '1';
  return Response.json({ next: final ? index : index + 1 });
}
