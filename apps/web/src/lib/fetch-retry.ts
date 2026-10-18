/**
 * fetch with retries for slow and dropped connections (BB-71).
 * It retries network failures, timeouts and 408, 429 and 5xx answers. Other answers come back
 * as they are, because trying again will not change a 400. It never throws away what the caller
 * already shows: the caller keeps its state and may use `onRetry` to say "trying again".
 * Do not use it for a request that is not safe to repeat unless the server ignores repeats.
 */
export interface RetryOptions {
  /** Total attempts, including the first. */
  tries?: number;
  /** Wait in ms before retry n (0-based). */
  backoff?: (retry: number) => number;
  /** Give up on one attempt after this long. Off by default. */
  timeoutMs?: number;
  /** Called before each wait, with the retry number (1-based). */
  onRetry?: (retry: number, reason: unknown) => void;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export const defaultBackoff = (retry: number) => Math.min(8000, 500 * 2 ** retry);

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const RETRY_STATUS = (status: number) => status === 408 || status === 429 || status >= 500;

function abortError(): Error {
  return new DOMException('The request was aborted.', 'AbortError');
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const {
    tries = 3,
    backoff = defaultBackoff,
    timeoutMs,
    onRetry,
    fetchImpl = fetch,
    sleep = realSleep,
  } = options;
  const attempts = Math.max(1, tries);
  const caller = init.signal ?? undefined;

  for (let attempt = 0; ; attempt++) {
    if (caller?.aborted) throw abortError();
    const timer = timeoutMs === undefined ? undefined : new AbortController();
    const timeout = timer ? setTimeout(() => timer.abort(), timeoutMs) : undefined;
    const signal =
      timer && caller ? AbortSignal.any([caller, timer.signal]) : (timer?.signal ?? caller);
    let reason: unknown;
    try {
      const response = await fetchImpl(input, { ...init, signal });
      if (!RETRY_STATUS(response.status) || attempt + 1 >= attempts) return response;
      reason = response.status;
    } catch (error) {
      // The caller cancelled on purpose, so stop at once.
      if (caller?.aborted || attempt + 1 >= attempts) throw error;
      reason = error;
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
    onRetry?.(attempt + 1, reason);
    await sleep(backoff(attempt));
  }
}
