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
  /** Opaque try id. Never a name or username. */
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

const defaultBackoff = (attempt: number) => Math.min(8000, 500 * 2 ** attempt);
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ChunkUploader {
  private readonly queue: Item[] = [];
  private pump: Promise<void> | null = null;
  private status: UploadStatus = 'idle';
  private closed = false;
  private failure: Error | null = null;

  constructor(private readonly opts: UploaderOptions) {}

  push(chunk: Blob, index: number): void {
    if (this.closed) return;
    this.queue.push({ index, body: chunk, final: false });
    this.run();
  }

  /** No more chunks. Resolves when everything is acknowledged, rejects if a chunk was given up on. */
  async finish(totalChunks: number): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      this.queue.push({ index: totalChunks, body: new Blob([]), final: true });
    }
    this.run();
    while (this.pump) await this.pump;
    if (this.failure) throw this.failure;
    this.set('done');
  }

  /** Drop everything unsent, for restart. */
  cancel(): void {
    this.closed = true;
    this.queue.length = 0;
  }

  private set(status: UploadStatus) {
    if (this.status === status) return;
    this.status = status;
    this.opts.onStatus?.(status);
  }

  private run() {
    if (this.pump || this.failure) return;
    this.pump = this.drain().finally(() => {
      this.pump = null;
    });
  }

  private async drain() {
    const sleep = this.opts.sleep ?? realSleep;
    const backoff = this.opts.backoff ?? defaultBackoff;
    const max = this.opts.maxAttempts ?? 6;
    while (this.queue.length > 0) {
      const item = this.queue[0]!;
      let failures = 0;
      for (;;) {
        this.set(failures === 0 ? 'sending' : 'retrying');
        try {
          const ack = await this.send(item);
          // If a reply was lost but the chunk landed, the server is ahead. Skip what it has.
          while (this.queue[0] && !this.queue[0].final && this.queue[0].index < ack.next) {
            this.queue.shift();
          }
          if (item.final) this.queue.shift();
          break;
        } catch (error) {
          failures += 1;
          if (failures >= max) {
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
    const params = new URLSearchParams({ try: this.opts.tryId, index: String(item.index) });
    if (item.final) params.set('final', '1');
    const response = await f(`${this.opts.endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: { 'content-type': item.body.type || 'application/octet-stream' },
      body: item.body,
    });
    if (!response.ok) throw new Error(`chunk ${item.index} rejected (${response.status})`);
    const data = (await response.json()) as Partial<ChunkAck>;
    if (typeof data.next !== 'number') throw new Error('bad acknowledgement');
    return { next: data.next };
  }
}
