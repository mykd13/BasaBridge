/**
 * Every AI and speech call is metered (BB-39): latency, cost and outcome, written to a sink
 * (the ai_calls table in the app) and to the log. Only ids, models, counts and money are
 * recorded. Prompts, replies, audio and transcripts never reach the meter.
 */
import type { Logger } from './log';

export const CALL_KINDS = ['story', 'verifier', 'notes', 'speech', 'tts'] as const;
export type CallKind = (typeof CALL_KINDS)[number];

export const CALL_OUTCOMES = ['ok', 'error', 'timeout', 'invalid', 'limited'] as const;
/** `invalid` means the provider answered but the reply failed validation. */
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export interface CallContext {
  kind: CallKind;
  /** AI Gateway model string or speech provider name. */
  model: string;
  learnerUserId?: string | null;
  storyId?: string | null;
  /** Groups the calls of one story generation (generator, verifier, retries) before it has a story id. */
  runId?: string | null;
}

export interface CallRecord {
  kind: CallKind;
  model: string;
  outcome: CallOutcome;
  latencyMs: number;
  /** US dollars. Null when the provider did not report a cost. */
  costUsd: number | null;
  learnerUserId: string | null;
  storyId: string | null;
  runId: string | null;
  at: Date;
}

export interface CallSink {
  record(call: CallRecord): Promise<void>;
}

export interface MeterOptions<T> {
  sink: CallSink;
  logger: Logger;
  /** Reads the cost from a successful result, for example with `gatewayCost`. */
  cost?: (result: T) => number | null;
  /** Classifies a successful result, for example `invalid` when it fails the schema. */
  outcome?: (result: T) => CallOutcome;
  /** Monotonic clock in milliseconds. */
  clock?: () => number;
  now?: () => Date;
}

/**
 * Runs `fn`, then records one call. The result or error passes through unchanged. A failing sink
 * is logged and never breaks the call it measures.
 */
export async function meterCall<T>(
  context: CallContext,
  fn: () => Promise<T>,
  options: MeterOptions<T>,
): Promise<T> {
  const clock = options.clock ?? (() => performance.now());
  const started = clock();
  let outcome: CallOutcome = 'ok';
  let cost: number | null = null;
  try {
    const result = await fn();
    outcome = options.outcome?.(result) ?? 'ok';
    cost = safeCost(() => options.cost?.(result) ?? null);
    return result;
  } catch (err) {
    outcome = isTimeout(err) ? 'timeout' : 'error';
    throw err;
  } finally {
    await recordCall(
      {
        kind: context.kind,
        model: context.model,
        outcome,
        latencyMs: Math.max(0, Math.round(clock() - started)),
        costUsd: cost,
        learnerUserId: context.learnerUserId ?? null,
        storyId: context.storyId ?? null,
        runId: context.runId ?? null,
        at: (options.now ?? (() => new Date()))(),
      },
      options.sink,
      options.logger,
    );
  }
}

/** Records a call that was measured elsewhere, such as one refused by a rate limit. */
export async function recordCall(call: CallRecord, sink: CallSink, logger: Logger): Promise<void> {
  const level = call.outcome === 'ok' ? 'info' : 'warn';
  logger[level]('ai.call', { ...call, at: undefined });
  try {
    await sink.record(call);
  } catch (err) {
    logger.error('ai.call.record_failed', { kind: call.kind, error: err });
  }
}

function safeCost(read: () => number | null): number | null {
  try {
    const v = read();
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  } catch {
    return null;
  }
}

function isTimeout(err: unknown): boolean {
  const e = err as { name?: unknown; message?: unknown } | null;
  const name = typeof e?.name === 'string' ? e.name : '';
  const message = typeof e?.message === 'string' ? e.message : '';
  return name === 'TimeoutError' || name === 'AbortError' || /timed? ?out/i.test(message);
}

/**
 * The cost the Vercel AI Gateway reports for one call, in US dollars. The AI SDK puts it on the
 * result as `providerMetadata.gateway.cost`, usually a decimal string. Returns null when absent.
 */
export function gatewayCost(providerMetadata: unknown): number | null {
  const gateway = (providerMetadata as { gateway?: { cost?: unknown } } | null | undefined)
    ?.gateway;
  const raw = gateway?.cost;
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Speech providers bill by audio length. The rate comes from configuration, not code. */
export function speechCost(seconds: number, usdPerMinute: number | null): number | null {
  if (usdPerMinute === null || !Number.isFinite(seconds) || seconds < 0) return null;
  return (seconds / 60) * usdPerMinute;
}
