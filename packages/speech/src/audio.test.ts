import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AUDIO_RETENTION_DAYS,
  deleteAccountAudio,
  deleteOwnAudio,
  handleRecording,
  listOwnAudio,
  purgeExpiredAudio,
  readOwnAudio,
  type AudioDeps,
  type AudioRecord,
  type AudioRecordRepo,
} from './audio';
import { MemoryAudioStore, decryptAudio, encryptAudio, parseAudioKey } from './audio-store';
import type { SpeechProvider } from './index';

class MemoryRepo implements AudioRecordRepo {
  rows: (AudioRecord & { owner: string })[] = [];
  owner = 'learner-1';
  async insert(v: { tryId: string; storageKey: string; expiresAt: Date }) {
    const row = { ...v, id: `a${this.rows.length + 1}`, owner: this.owner };
    this.rows.push(row);
    return row;
  }
  async findOwned(owner: string, id: string) {
    return this.rows.find((r) => r.id === id && r.owner === owner);
  }
  async listForLearner(owner: string) {
    return this.rows.filter((r) => r.owner === owner);
  }
  async listExpired(now: Date) {
    return this.rows.filter((r) => r.expiresAt <= now);
  }
  async delete(id: string) {
    this.rows = this.rows.filter((r) => r.id !== id);
  }
}

const words = [{ text: 'the', start: 0, end: 0.2, confidence: 0.9 }];
const okProvider: SpeechProvider = { name: 'fake', transcribe: async () => words };
const failingProvider: SpeechProvider = {
  name: 'fail',
  transcribe: async () => {
    throw new Error('provider down');
  },
};

function setup(start = new Date('2026-01-01T00:00:00Z')) {
  const clock = { now: start };
  const deps: AudioDeps = {
    store: new MemoryAudioStore(),
    repo: new MemoryRepo(),
    key: randomBytes(32),
    now: () => clock.now,
  };
  return { deps, clock, store: deps.store as MemoryAudioStore, repo: deps.repo as MemoryRepo };
}

const clip = () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });
const base = { provider: okProvider, audio: clip(), referenceText: 'the cat', tryId: 't1' };

describe('retention off (default)', () => {
  it('stores nothing', async () => {
    const { deps, store, repo } = setup();
    const out = await handleRecording(deps, { ...base, retain: false });
    expect(out).toEqual({ words, audioId: null });
    expect(store.size).toBe(0);
    expect(repo.rows).toHaveLength(0);
  });

  it('stores nothing when analysis fails', async () => {
    const { deps, store, repo } = setup();
    await expect(
      handleRecording(deps, { ...base, provider: failingProvider, retain: true }),
    ).rejects.toThrow('provider down');
    expect(store.size).toBe(0);
    expect(repo.rows).toHaveLength(0);
  });
});

describe('retention on', () => {
  it('stores ciphertext that expires after 30 days', async () => {
    const { deps, store, repo } = setup();
    const { audioId } = await handleRecording(deps, { ...base, retain: true });
    expect(audioId).toBe('a1');
    const row = repo.rows[0]!;
    expect(row.expiresAt.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(AUDIO_RETENTION_DAYS).toBe(30);
    const stored = (await store.get(row.storageKey))!;
    expect(Buffer.from(stored).includes(Buffer.from([1, 2, 3, 4]))).toBe(false);
    const back = await readOwnAudio(deps, 'learner-1', 'a1');
    expect(back?.type).toBe('audio/webm');
    expect([...new Uint8Array(await back!.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });

  it('removes the blob if the row insert fails', async () => {
    const { deps, store, repo } = setup();
    repo.insert = async () => {
      throw new Error('db down');
    };
    await expect(handleRecording(deps, { ...base, retain: true })).rejects.toThrow('db down');
    expect(store.size).toBe(0);
  });

  it('lets only the owner read, list and delete', async () => {
    const { deps, store } = setup();
    await handleRecording(deps, { ...base, retain: true });
    expect(await readOwnAudio(deps, 'someone-else', 'a1')).toBeUndefined();
    expect(await listOwnAudio(deps, 'someone-else')).toHaveLength(0);
    expect(await deleteOwnAudio(deps, 'someone-else', 'a1')).toBe(false);
    expect(store.size).toBe(1);
    expect(await deleteOwnAudio(deps, 'learner-1', 'a1')).toBe(true);
    expect(store.size).toBe(0);
  });

  it('does not play an expired recording', async () => {
    const { deps, clock } = setup();
    await handleRecording(deps, { ...base, retain: true });
    clock.now = new Date('2026-02-01T00:00:00Z');
    expect(await readOwnAudio(deps, 'learner-1', 'a1')).toBeUndefined();
  });

  it('purges expired recordings, blob and row, and keeps fresh ones', async () => {
    const { deps, clock, store, repo } = setup();
    await handleRecording(deps, { ...base, retain: true });
    clock.now = new Date('2026-01-20T00:00:00Z');
    await handleRecording(deps, { ...base, tryId: 't2', retain: true });
    clock.now = new Date('2026-02-05T00:00:00Z');
    expect(await purgeExpiredAudio(deps)).toBe(1);
    expect(repo.rows.map((r) => r.tryId)).toEqual(['t2']);
    expect(store.size).toBe(1);
  });

  it('account deletion leaves no blob', async () => {
    const { deps, store, repo } = setup();
    await handleRecording(deps, { ...base, retain: true });
    await handleRecording(deps, { ...base, tryId: 't2', retain: true });
    expect(await deleteAccountAudio(deps, 'learner-1')).toBe(2);
    expect(store.size).toBe(0);
    expect(repo.rows).toHaveLength(0);
  });
});

describe('encryption', () => {
  it('rejects a wrong key and a bad key length', () => {
    const data = encryptAudio(randomBytes(32), new Uint8Array([9]), 'audio/webm');
    expect(() => decryptAudio(randomBytes(32), data)).toThrow();
    expect(() => parseAudioKey('abc')).toThrow('32 bytes');
    expect(() => parseAudioKey(undefined)).toThrow('32 bytes');
    expect(parseAudioKey(randomBytes(32).toString('base64'))).toHaveLength(32);
  });
});
