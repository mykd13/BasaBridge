/**
 * Sends recorded chunks to the server in order and survives drops (BB-23).
 * The server acknowledges each chunk with the next index it expects, so a retry never
 * duplicates audio and a dropped connection resumes where it left off.
 * Create one uploader per try, only after the learner has started that try.
 */
export interface ChunkAck {
  next: number;
}

export type UploadStatus = 'idle' | 'sending' | 'retrying' | 'done' | 'failed';

export interface UploaderOptions {
  /** Same-origin path, for example /api/speech/chunks. */
  endpoint: string;
  /** Opaque try id. Never a name or username. Sent in a header, so it stays out of URLs and access logs. */
  tryId: string;
  fetchImpl?: typeof fetch;
  /** Delay before retry n (0-based) in ms. */
  backoff?: (attempt: number) => number;
  /** Give up on one chunk after this many failures in a row. */
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  onStatus?: (status: UploadStatus) => void;
}

interface Item {
  index: number;
  body: Blob;
  final: boolean;
}

export const TRY_HEADER = 'x-bb-try';

/** A server answer that retrying cannot fix, such as 400 or 413. */
class PermanentError extends Error {}

const defaultBackoff = (attempt: number) => Math.min(8000, 500 * 2 ** attempt);
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Make an opaque try id. crypto.randomUUID is missing on non-secure origins, so fall back. */
export function newTryId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class ChunkUploader {
  private readonly queue: Item[] = [];
  private pump: Promise<void> | null = null;
  private status: UploadStatus = 'idle';
  private closed = false;
  private cancelled = false;
  private failure: Error | null = null;
  private readonly abort = new AbortController();

  constructor(private readonly opts: UploaderOptions) {}

  push(chunk: Blob, index: number): void {
    if (this.closed || this.cancelled || this.failure) return;
    this.queue.push({ index, body: chunk, final: false });
    this.run();
  }

  /** No more chunks. Resolves when everything is acknowledged, rejects if a chunk was given up on. */
  async finish(totalChunks: number): Promise<void> {
    if (this.cancelled) return;
    if (!this.closed) {
      this.closed = true;
      this.queue.push({ index: totalChunks, body: new Blob([]), final: true });
    }
    this.run();
    while (this.pump) await this.pump;
    if (this.cancelled) return;
    if (this.failure) throw this.failure;
    this.set('done');
  }

  /** Drop everything unsent and abort the request in flight. Used for restart and for leaving mid try. */
  cancel(): void {
    this.cancelled = true;
    this.closed = true;
    this.queue.length = 0;
    this.abort.abort();
  }

  private set(status: UploadStatus) {
    if (this.cancelled || this.status === status) return;
    this.status = status;
    this.opts.onStatus?.(status);
  }

  private run() {
    if (this.pump || this.failure || this.cancelled) return;
    this.pump = this.drain().finally(() => {
      this.pump = null;
    });
  }

  private async drain() {
    const sleep = this.opts.sleep ?? realSleep;
    const backoff = this.opts.backoff ?? defaultBackoff;
    const max = this.opts.maxAttempts ?? 6;
    while (this.queue.length > 0 && !this.cancelled) {
      const item = this.queue[0]!;
      let failures = 0;
      while (!this.cancelled) {
        this.set(failures === 0 ? 'sending' : 'retrying');
        try {
          const ack = await this.send(item);
          if (this.cancelled) return;
          // A chunk must move the server forward. If it still expects this index (it did not keep the chunk)
          // or an earlier one, that is a failure, so it goes through the backoff and the failure counter.
          const progressed = item.final ? ack.next >= item.index : ack.next > item.index;
          if (!progressed) throw new Error(`server expects chunk ${ack.next}, sent ${item.index}`);
          // If a reply was lost but the chunk landed, the server is ahead. Skip what it has.
          while (this.queue[0] && !this.queue[0].final && this.queue[0].index < ack.next) {
            this.queue.shift();
          }
          if (item.final) this.queue.shift();
          break;
        } catch (error) {
          if (this.cancelled) return;
          failures += 1;
          if (error instanceof PermanentError || failures >= max) {
            this.failure = error instanceof Error ? error : new Error('upload failed');
            this.queue.length = 0;
            this.set('failed');
            return;
          }
          await sleep(backoff(failures - 1));
        }
      }
    }
  }

  private async send(item: Item): Promise<ChunkAck> {
    const f = this.opts.fetchImpl ?? fetch;
    const params = new URLSearchParams({ index: String(item.index) });
    if (item.final) params.set('final', '1');
    const response = await f(`${this.opts.endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'content-type': item.body.type || 'application/octet-stream',
        [TRY_HEADER]: this.opts.tryId,
      },
      body: item.body,
      signal: this.abort.signal,
    });
    if (!response.ok) {
      const message = `chunk ${item.index} rejected (${response.status})`;
      // 4xx means our request is wrong, so repeating it will not help. 408 and 429 are worth another go.
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429
      ) {
        throw new PermanentError(message);
      }
      throw new Error(message);
    }
    const data = (await response.json()) as Partial<ChunkAck>;
    if (typeof data.next !== 'number') throw new Error('bad acknowledgement');
    return { next: data.next };
  }
}
