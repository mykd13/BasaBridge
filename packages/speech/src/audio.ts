/**
 * Audio handling (BB-30, docs/PLAN.md sections 8 and 9).
 *
 * - Default: the recording is analysed in memory and dropped. Nothing is stored.
 * - Retention on: the recording is stored encrypted and expires after 30 days.
 * - The learner can list, play and delete their own recordings.
 * - Deleting an account removes the stored blobs as well as the rows.
 *
 * These functions do not check who is asking. Learner audio must be reached through the
 * authorization layer (BB-10), which must refuse parents. Parents never get audio.
 */
import { randomUUID } from 'node:crypto';
import { decryptAudio, encryptAudio, type AudioStore } from './audio-store';
import type { HeardWord, SpeechProvider } from './index';

export const AUDIO_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface AudioRecord {
  id: string;
  tryId: string;
  storageKey: string;
  expiresAt: Date;
}

/** Row access for audio_objects. The app implements it on top of packages/db. */
export interface AudioRecordRepo {
  insert(values: { tryId: string; storageKey: string; expiresAt: Date }): Promise<AudioRecord>;
  /** The record only if it belongs to this learner. */
  findOwned(learnerUserId: string, id: string): Promise<AudioRecord | undefined>;
  listForLearner(learnerUserId: string): Promise<AudioRecord[]>;
  listExpired(now: Date): Promise<AudioRecord[]>;
  delete(id: string): Promise<void>;
}

export interface AudioDeps {
  store: AudioStore;
  repo: AudioRecordRepo;
  /** 32-byte AES key from AUDIO_ENCRYPTION_KEY. */
  key: Buffer;
  now?: () => Date;
}

export interface HandleRecordingInput {
  provider: SpeechProvider;
  audio: Blob;
  referenceText: string;
  tryId: string;
  /** The learner's keep-audio setting, read on the server. */
  retain: boolean;
  signal?: AbortSignal;
}

/**
 * Transcribe a recording. With retention off the blob is never written anywhere.
 * With retention on it is stored only after analysis succeeded, so a failed try leaves nothing.
 */
export async function handleRecording(
  deps: AudioDeps,
  input: HandleRecordingInput,
): Promise<{ words: HeardWord[]; audioId: string | null }> {
  const words = await input.provider.transcribe(input.audio, {
    referenceText: input.referenceText,
    signal: input.signal,
  });
  if (!input.retain) return { words, audioId: null };

  const now = currentTime(deps);
  const bytes = new Uint8Array(await input.audio.arrayBuffer());
  const storageKey = `audio/${input.tryId}/${randomUUID()}`;
  await deps.store.put(storageKey, encryptAudio(deps.key, bytes, input.audio.type));
  try {
    const record = await deps.repo.insert({
      tryId: input.tryId,
      storageKey,
      expiresAt: new Date(now.getTime() + AUDIO_RETENTION_DAYS * DAY_MS),
    });
    return { words, audioId: record.id };
  } catch (error) {
    await deps.store.delete(storageKey);
    throw error;
  }
}

/** The learner's own recordings that have not expired. Expired rows wait for the purge job. */
export async function listOwnAudio(deps: AudioDeps, learnerUserId: string): Promise<AudioRecord[]> {
  const now = currentTime(deps);
  const records = await deps.repo.listForLearner(learnerUserId);
  return records.filter((r) => r.expiresAt > now);
}

/** Decrypt one of the learner's own recordings for playback. */
export async function readOwnAudio(
  deps: AudioDeps,
  learnerUserId: string,
  id: string,
): Promise<Blob | undefined> {
  const record = await deps.repo.findOwned(learnerUserId, id);
  if (!record || record.expiresAt <= currentTime(deps)) return undefined;
  const data = await deps.store.get(record.storageKey);
  if (!data) return undefined;
  const { bytes, mimeType } = decryptAudio(deps.key, data);
  return new Blob([bytes as BlobPart], { type: mimeType });
}

/** Delete one of the learner's own recordings early. Returns false if it is not theirs. */
export async function deleteOwnAudio(
  deps: AudioDeps,
  learnerUserId: string,
  id: string,
): Promise<boolean> {
  const record = await deps.repo.findOwned(learnerUserId, id);
  if (!record) return false;
  await removeRecord(deps, record);
  return true;
}

/** A sweep removes what it can. Records that failed stay in place so the next sweep retries them. */
export interface SweepResult {
  removed: number;
  failed: { id: string; error: unknown }[];
}

/** Scheduled job: delete every expired recording. One failed delete does not stop the rest. */
export async function purgeExpiredAudio(deps: AudioDeps): Promise<SweepResult> {
  return removeAll(deps, await deps.repo.listExpired(currentTime(deps)));
}

/**
 * Account deletion: remove every stored blob first. Dropping the user row only cascades the
 * rows, so call this before deleteUser, or the encrypted blobs would be left behind.
 * Check `failed` and do not drop the user while it is not empty.
 */
export async function deleteAccountAudio(
  deps: AudioDeps,
  learnerUserId: string,
): Promise<SweepResult> {
  return removeAll(deps, await deps.repo.listForLearner(learnerUserId));
}

async function removeAll(deps: AudioDeps, records: AudioRecord[]): Promise<SweepResult> {
  const result: SweepResult = { removed: 0, failed: [] };
  for (const record of records) {
    try {
      await removeRecord(deps, record);
      result.removed += 1;
    } catch (error) {
      result.failed.push({ id: record.id, error });
    }
  }
  return result;
}

function currentTime(deps: AudioDeps): Date {
  return (deps.now ?? (() => new Date()))();
}

/** Blob first, then row. If the blob delete fails the row stays, so the sweep retries it. */
async function removeRecord(deps: AudioDeps, record: AudioRecord): Promise<void> {
  await deps.store.delete(record.storageKey);
  await deps.repo.delete(record.id);
}
