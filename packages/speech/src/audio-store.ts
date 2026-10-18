/**
 * Audio storage port and encryption (BB-30, docs/PLAN.md section 8).
 * Audio only reaches a store when the learner turned retention on, and only as ciphertext.
 * The real bucket (encrypted at rest) plugs in behind AudioStore. Nothing here touches disk.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Where encrypted recordings live. Keys carry no names or usernames. */
export interface AudioStore {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | undefined>;
  /** Deleting a key that does not exist is not an error. */
  delete(key: string): Promise<void>;
}

/** Test and local-development store. Holds bytes in memory only. */
export class MemoryAudioStore implements AudioStore {
  private readonly objects = new Map<string, Uint8Array>();

  async put(key: string, bytes: Uint8Array): Promise<void> {
    this.objects.set(key, bytes);
  }
  async get(key: string): Promise<Uint8Array | undefined> {
    return this.objects.get(key);
  }
  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
  get size(): number {
    return this.objects.size;
  }
}

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Parse the base64 AUDIO_ENCRYPTION_KEY (32 bytes, for example `openssl rand -base64 32`). */
export function parseAudioKey(base64: string | undefined): Buffer {
  const key = Buffer.from(base64 ?? '', 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error('AUDIO_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
  }
  return key;
}

/** AES-256-GCM. Output is iv, then auth tag, then ciphertext. The mime type travels inside. */
export function encryptAudio(key: Buffer, bytes: Uint8Array, mimeType: string): Uint8Array {
  const mime = Buffer.from(mimeType, 'utf8');
  if (mime.length > 255) throw new Error('mime type too long');
  const plain = Buffer.concat([Buffer.from([mime.length]), mime, bytes]);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function decryptAudio(
  key: Buffer,
  data: Uint8Array,
): { bytes: Uint8Array; mimeType: string } {
  const buf = Buffer.from(data);
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(buf.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]);
  const mimeLen = plain[0]!;
  return {
    mimeType: plain.subarray(1, 1 + mimeLen).toString('utf8'),
    bytes: plain.subarray(1 + mimeLen),
  };
}
