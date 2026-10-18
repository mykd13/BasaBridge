/** Helpers shared by the vendor adapters. */
import { DataError } from '../data.ts';
import { ProviderError } from '../log.ts';
import { chunks } from '../wav.ts';
import type { Wav } from '../wav.ts';

export function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (!v) throw new DataError(`Set ${key} in .env.local to use this provider.`);
  return v;
}

/** Open a WebSocket. Node's built-in WebSocket (undici) accepts headers as an extension. */
export function openSocket(url: string, headers: Record<string, string> = {}): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const Ctor = WebSocket as unknown as new (
      u: string,
      init: { headers: Record<string, string> },
    ) => WebSocket;
    const ws = new Ctor(url, { headers });
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', () => reject(new ProviderError('ws_open')), { once: true });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let deleteFailures = 0;

/**
 * Delete something on the vendor's side. A failure is counted, not thrown, so the result is
 * kept; run.ts reads the count after each call, stores it with the result and logs it.
 */
export async function deleteOnVendor(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) deleteFailures++;
  } catch {
    deleteFailures++;
  }
}

/** Record a deletion that could not even be attempted, such as an orphaned upload. */
export function noteDeleteFailure() {
  deleteFailures++;
}

/** Number of deletion failures since the last call. */
export function takeDeleteFailures(): number {
  const n = deleteFailures;
  deleteFailures = 0;
  return n;
}

/**
 * Send PCM at real-time pace, the way a browser would. Returns performance.now() of the first
 * and last chunk so adapters can measure time to first word and time after the end.
 */
export async function streamPcm(
  wav: Wav,
  send: (chunk: Uint8Array<ArrayBuffer>) => void,
  chunkMs = 100,
): Promise<{ firstAt: number; lastAt: number }> {
  const firstAt = performance.now();
  let k = 0;
  for (const c of chunks(wav, chunkMs)) {
    const due = firstAt + k * chunkMs;
    const wait = due - performance.now();
    if (wait > 0) await sleep(wait);
    send(c);
    k++;
  }
  return { firstAt, lastAt: performance.now() };
}

/** Poll until done() returns a value, or the signal aborts. */
export async function poll<T>(
  check: () => Promise<T | null>,
  signal: AbortSignal | undefined,
  everyMs = 500,
): Promise<T> {
  for (;;) {
    signal?.throwIfAborted();
    const v = await check();
    if (v !== null) return v;
    await sleep(everyMs);
  }
}

/** Unique words of the passage, for keyword-style biasing features. */
export function passageTerms(referenceText: string, max: number): string[] {
  const seen = new Set<string>();
  for (const w of referenceText.split(/\s+/)) {
    const clean = w.replace(/[^A-Za-z'-]/g, '');
    if (clean.length > 0) seen.add(clean);
  }
  return [...seen].slice(0, max);
}
