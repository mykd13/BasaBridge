import { describe, expect, it, vi } from 'vitest';
import { callWithFallback, type ModelLog } from './fallback';

const models = { primary: 'google/story-a', fallback: 'google/story-b' };

function recorder() {
  const lines: { level: 'info' | 'warn'; event: string; fields: Record<string, unknown> }[] = [];
  const log: ModelLog = {
    info: (event, fields) => lines.push({ level: 'info', event, fields }),
    warn: (event, fields) => lines.push({ level: 'warn', event, fields }),
  };
  return { log, lines };
}

const never = (_model: string, signal: AbortSignal) =>
  new Promise<string>((_, reject) =>
    signal.addEventListener('abort', () => reject(new Error('aborted'))),
  );

describe('callWithFallback', () => {
  it('uses the primary when it answers', async () => {
    const { log, lines } = recorder();
    const call = vi.fn(async (model: string) => `story from ${model}`);
    const r = await callWithFallback({ role: 'story', models, call, timeoutMs: 1000, log });
    expect(r).toEqual({
      ok: true,
      value: 'story from google/story-a',
      model: 'google/story-a',
      fallbackUsed: false,
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(lines).toEqual([
      {
        level: 'info',
        event: 'ai.model_choice',
        fields: expect.objectContaining({
          role: 'story',
          model: 'google/story-a',
          fallbackUsed: false,
          primaryFailure: null,
        }),
      },
    ]);
  });

  it('tries the fallback when the primary throws, and logs why', async () => {
    const { log, lines } = recorder();
    const call = vi.fn(async (model: string) => {
      if (model === models.primary) throw new Error('503 from provider');
      return 'ok';
    });
    const r = await callWithFallback({ role: 'verifier', models, call, timeoutMs: 1000, log });
    expect(r).toMatchObject({ ok: true, model: 'google/story-b', fallbackUsed: true });
    expect(lines.map((l) => [l.level, l.event])).toEqual([
      ['warn', 'ai.model_fallback'],
      ['info', 'ai.model_choice'],
    ]);
    expect(lines[0]!.fields).toMatchObject({
      role: 'verifier',
      model: models.primary,
      reason: 'error',
    });
    expect(lines[1]!.fields).toMatchObject({ fallbackUsed: true, primaryFailure: 'error' });
  });

  it('tries the fallback when the primary times out, and aborts the slow call', async () => {
    vi.useFakeTimers();
    try {
      const { log, lines } = recorder();
      const signals: AbortSignal[] = [];
      const call = vi.fn((model: string, signal: AbortSignal) => {
        signals.push(signal);
        return model === models.primary ? never(model, signal) : Promise.resolve('fast');
      });
      const pending = callWithFallback({ role: 'notes', models, call, timeoutMs: 500, log });
      await vi.advanceTimersByTimeAsync(500);
      const r = await pending;
      expect(r).toMatchObject({ ok: true, value: 'fast', fallbackUsed: true });
      expect(signals[0]!.aborted).toBe(true);
      expect(lines[0]!.fields).toMatchObject({ reason: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns both failures when both models fail, without throwing', async () => {
    const { log, lines } = recorder();
    const call = vi.fn(async () => {
      throw new Error('down');
    });
    const r = await callWithFallback({ role: 'story', models, call, timeoutMs: 1000, log });
    expect(r).toEqual({
      ok: false,
      failures: [
        { model: 'google/story-a', reason: 'error' },
        { model: 'google/story-b', reason: 'error' },
      ],
    });
    expect(lines.map((l) => l.event)).toEqual(['ai.model_fallback', 'ai.model_unavailable']);
  });

  it('logs only the role, model, reason and timing, never the error message or output', async () => {
    const { log, lines } = recorder();
    const secret = 'Maria read the story about the carabao';
    const call = vi.fn(async (model: string) => {
      if (model === models.primary) throw new Error(`bad request: ${secret}`);
      return secret;
    });
    await callWithFallback({ role: 'story', models, call, timeoutMs: 1000, log });
    const allowed = ['role', 'model', 'reason', 'fallbackUsed', 'primaryFailure', 'durationMs'];
    for (const line of lines) {
      expect(Object.keys(line.fields).every((k) => allowed.includes(k))).toBe(true);
    }
    expect(JSON.stringify(lines)).not.toContain('carabao');
  });
});
