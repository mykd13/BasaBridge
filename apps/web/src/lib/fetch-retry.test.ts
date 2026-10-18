import { describe, expect, it, vi } from 'vitest';
import { fetchWithRetry } from './fetch-retry';

const res = (status: number) => new Response(null, { status });
const noWait = async () => {};

function sequence(...steps: (Response | Error)[]) {
  const calls = vi.fn<typeof fetch>();
  for (const step of steps) {
    if (step instanceof Error) calls.mockRejectedValueOnce(step);
    else calls.mockResolvedValueOnce(step);
  }
  return calls;
}

describe('fetchWithRetry', () => {
  it('returns the first good answer without waiting', async () => {
    const fetchImpl = sequence(res(200));
    const sleep = vi.fn(noWait);
    const out = await fetchWithRetry('/x', {}, { fetchImpl, sleep });
    expect(out.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a dropped connection and a 503, then succeeds', async () => {
    const fetchImpl = sequence(new TypeError('Failed to fetch'), res(503), res(200));
    const onRetry = vi.fn();
    const sleep = vi.fn(noWait);
    const backoff = (n: number) => 100 * (n + 1);
    const out = await fetchWithRetry('/x', {}, { fetchImpl, sleep, backoff, onRetry });
    expect(out.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
    expect(onRetry.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  });

  it('stops after the number of tries and throws the last network error', async () => {
    const fetchImpl = sequence(new TypeError('a'), new TypeError('b'), new TypeError('c'));
    await expect(fetchWithRetry('/x', {}, { fetchImpl, sleep: noWait, tries: 3 })).rejects.toThrow(
      'c',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('returns the last 5xx answer when the tries run out', async () => {
    const fetchImpl = sequence(res(500), res(502));
    const out = await fetchWithRetry('/x', {}, { fetchImpl, sleep: noWait, tries: 2 });
    expect(out.status).toBe(502);
  });

  it.each([400, 401, 404, 413])('does not retry a %i', async (status) => {
    const fetchImpl = sequence(res(status));
    const out = await fetchWithRetry('/x', {}, { fetchImpl, sleep: noWait });
    expect(out.status).toBe(status);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries 408 and 429', async () => {
    const fetchImpl = sequence(res(408), res(429), res(200));
    const out = await fetchWithRetry('/x', {}, { fetchImpl, sleep: noWait });
    expect(out.status).toBe(200);
  });

  it('does not retry when the caller aborts', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      controller.abort();
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(
      fetchWithRetry('/x', { signal: controller.signal }, { fetchImpl, sleep: noWait }),
    ).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('gives up on a slow attempt after timeoutMs and tries again', async () => {
    let n = 0;
    const fetchImpl = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((resolve, reject) => {
          if (++n === 2) return resolve(res(200));
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('t', 'AbortError')),
          );
        }),
    );
    const out = await fetchWithRetry('/x', {}, { fetchImpl, sleep: noWait, timeoutMs: 20 });
    expect(out.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('passes the request init through unchanged', async () => {
    const fetchImpl = sequence(res(200));
    await fetchWithRetry('/x', { method: 'POST', body: 'a' }, { fetchImpl });
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', body: 'a' });
  });
});
