/**
 * Calls a role's primary model and tries its fallback when the first call fails or times out
 * (docs/PLAN.md section 7, BB-73). Every choice is logged with the role, the model and the reason
 * only. Prompts, model output and error messages are never logged, since an error message can
 * repeat what was sent.
 *
 * Invalid output is not a reason to switch models here. The generation retry loop (BB-15, BB-16)
 * handles that with the failure reason.
 */
import type { ModelChain, ModelRole } from './roles';

/** The part of the BB-39 Logger this needs, so either that logger or a test double fits. */
export interface ModelLog {
  info(event: string, fields: Record<string, unknown>): void;
  warn(event: string, fields: Record<string, unknown>): void;
}

export type ModelFailureReason = 'error' | 'timeout';

export interface ModelFailure {
  model: string;
  reason: ModelFailureReason;
}

export interface CallWithFallbackInput<T> {
  role: ModelRole;
  models: ModelChain;
  /** Makes one model call. Should stop work when `signal` aborts. */
  call: (model: string, signal: AbortSignal) => Promise<T>;
  timeoutMs: number;
  log: ModelLog;
  now?: () => number;
}

export type CallWithFallbackResult<T> =
  | { ok: true; value: T; model: string; fallbackUsed: boolean }
  | { ok: false; failures: ModelFailure[] };

class ModelTimeout extends Error {}

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new ModelTimeout());
      controller.abort();
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } catch (err) {
    // The aborted call may reject first with its own error. It still counts as a timeout.
    throw timedOut ? new ModelTimeout() : err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries the primary model, then the fallback. Never throws for a failed model call: when both
 * fail it returns the failures, so the caller can fail visibly or serve from the story bank.
 */
export async function callWithFallback<T>({
  role,
  models,
  call,
  timeoutMs,
  log,
  now = Date.now,
}: CallWithFallbackInput<T>): Promise<CallWithFallbackResult<T>> {
  const started = now();
  const failures: ModelFailure[] = [];

  for (const model of [models.primary, models.fallback]) {
    const fallbackUsed = model !== models.primary;
    try {
      const value = await withTimeout((signal) => call(model, signal), timeoutMs);
      log.info('ai.model_choice', {
        role,
        model,
        fallbackUsed,
        primaryFailure: failures[0]?.reason ?? null,
        durationMs: now() - started,
      });
      return { ok: true, value, model, fallbackUsed };
    } catch (err) {
      const reason: ModelFailureReason = err instanceof ModelTimeout ? 'timeout' : 'error';
      failures.push({ model, reason });
      log.warn(fallbackUsed ? 'ai.model_unavailable' : 'ai.model_fallback', {
        role,
        model,
        reason,
        durationMs: now() - started,
      });
    }
  }

  return { ok: false, failures };
}
