import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FLAG_CACHE_MS,
  clearFlagCache,
  defaultFlags,
  loadFlags,
  resolveFlags,
  setFlag,
} from './flags';

beforeEach(() => {
  clearFlagCache();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('defaults', () => {
  it('keeps risky features off and the microphone kill switch in normal operation', () => {
    expect(defaultFlags()).toEqual({
      microphone: true,
      listen_then_read: false,
      spoken_instructions: false,
      placement: false,
      model_choices: null,
    });
  });
});

describe('resolveFlags', () => {
  it('uses a stored value over the default', () => {
    expect(resolveFlags([{ key: 'placement', value: true }]).placement).toBe(true);
    expect(resolveFlags([{ key: 'microphone', value: false }]).microphone).toBe(false);
  });

  it('falls back to the default for a bad value and ignores unknown keys', () => {
    const flags = resolveFlags([
      { key: 'placement', value: 'yes' },
      { key: 'not_a_flag', value: true },
    ]);
    expect(flags).toEqual(defaultFlags());
  });

  it('accepts valid model choices and refuses a verifier equal to the story model', () => {
    const models = {
      story: 'google/gemini-3.8-flash',
      verifier: 'google/gemini-3.1-pro-preview',
      notes: 'google/gemini-3.8-flash',
    };
    expect(resolveFlags([{ key: 'model_choices', value: models }]).model_choices).toEqual(models);
    const same = { ...models, verifier: models.story };
    expect(resolveFlags([{ key: 'model_choices', value: same }]).model_choices).toBeNull();
    const bad = { ...models, notes: 'not a model' };
    expect(resolveFlags([{ key: 'model_choices', value: bad }]).model_choices).toBeNull();
  });
});

describe('loadFlags', () => {
  it('returns the safe defaults when the database read fails', async () => {
    const flags = await loadFlags(() => Promise.reject(new Error('down')));
    expect(flags).toEqual(defaultFlags());
  });

  it('reuses the defaults briefly after a failed read, then tries again', async () => {
    const read = vi.fn().mockRejectedValue(new Error('down'));
    await loadFlags(read, 0);
    await loadFlags(read, 1_000);
    expect(read).toHaveBeenCalledTimes(1);
    const flags = await loadFlags(
      () => Promise.resolve([{ key: 'placement', value: true }]),
      6_000,
    );
    expect(flags.placement).toBe(true);
  });

  it('warns once about an invalid stored value across refreshes', async () => {
    const read = () => Promise.resolve([{ key: 'placement', value: 'yes' }]);
    await loadFlags(read, 0);
    await loadFlags(read, FLAG_CACHE_MS + 1);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('reuses a read inside the cache window and reads again after it', async () => {
    const read = vi.fn().mockResolvedValue([{ key: 'placement', value: true }]);
    await loadFlags(read, 0);
    await loadFlags(read, FLAG_CACHE_MS - 1);
    expect(read).toHaveBeenCalledTimes(1);
    await loadFlags(read, FLAG_CACHE_MS + 1);
    expect(read).toHaveBeenCalledTimes(2);
  });
});

describe('setFlag', () => {
  it('refuses an invalid value before touching the database', async () => {
    const db = {} as never;
    await expect(setFlag('placement', 'on' as never, null, db)).rejects.toThrow('Invalid value');
    await expect(setFlag('nope' as never, true as never, null, db)).rejects.toThrow('Unknown flag');
  });

  it('validates before it needs a database connection', async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(setFlag('nope' as never, true as never, null)).rejects.toThrow('Unknown flag');
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });
});
