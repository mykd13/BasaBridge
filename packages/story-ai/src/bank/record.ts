import { z } from 'zod';
import type {
  Clock,
  Logger,
  PipelineInput,
  PipelineOutcome,
  StoryErrorKind,
  StoryPipeline,
} from './types';

const nonNegative = z.number().min(0);

/**
 * One generation attempt, for cost and latency. Strict on purpose: it holds counts, timings and
 * cost only, so story text, names, learner ids and audio can never be added by accident.
 */
export const GenerationRecord = z
  .object({
    level: z.number().int(),
    topic: z.string(),
    outcome: z.enum(['stored', 'rejected', 'failed']),
    errorKind: z
      .enum(['config', 'model_call', 'invalid_output', 'checks_failed', 'verifier_rejected'])
      .optional(),
    attempts: z.number().int().min(0),
    latencyMs: nonNegative,
    inputTokens: nonNegative.optional(),
    outputTokens: nonNegative.optional(),
    costUsd: nonNegative.optional(),
    trigger: z.enum(['refill', 'live']),
  })
  .strict();
export type GenerationRecord = z.infer<typeof GenerationRecord>;

const REJECTED: readonly StoryErrorKind[] = ['checks_failed', 'verifier_rejected'];

/** Run the pipeline and time it. A throw becomes a failed outcome, so callers never see one. */
export async function timedRun(
  pipeline: StoryPipeline,
  input: PipelineInput,
  clock: Clock,
): Promise<{ outcome: PipelineOutcome; latencyMs: number }> {
  const start = clock();
  let outcome: PipelineOutcome;
  try {
    outcome = await pipeline(input);
  } catch (err) {
    outcome = {
      ok: false,
      error: { kind: 'model_call', reason: err instanceof Error ? err.message : 'pipeline threw' },
      usage: { attempts: 0 },
    };
  }
  return { outcome, latencyMs: Math.max(0, clock() - start) };
}

export function toRecord(
  input: Pick<PipelineInput, 'level' | 'topic'>,
  outcome: PipelineOutcome,
  latencyMs: number,
  trigger: GenerationRecord['trigger'],
): GenerationRecord {
  const { usage } = outcome;
  const record: GenerationRecord = {
    level: input.level,
    topic: input.topic,
    outcome: outcome.ok ? 'stored' : REJECTED.includes(outcome.error.kind) ? 'rejected' : 'failed',
    attempts: usage.attempts,
    latencyMs,
    trigger,
  };
  if (!outcome.ok) record.errorKind = outcome.error.kind;
  if (usage.inputTokens !== undefined) record.inputTokens = usage.inputTokens;
  if (usage.outputTokens !== undefined) record.outputTokens = usage.outputTokens;
  if (usage.costUsd !== undefined) record.costUsd = usage.costUsd;
  return record;
}

/** Validate first, then log. An invalid record throws instead of leaking extra fields. */
export function logRecord(log: Logger, record: GenerationRecord): void {
  log('story_generation', GenerationRecord.parse(record));
}
