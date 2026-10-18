/**
 * One evaluation run, as stored on disk (BB-21). Raw per-story results only: summaries are
 * recomputed from these by `summarize`, so a stored run never disagrees with the current metrics.
 *
 * A run holds levels, generated story text, counts, model names and costs. Never an API key,
 * a learner name, a username or audio.
 */
import { Level } from '@basabridge/contracts';
import { z } from 'zod';

export const Cost = z.object({
  /** US dollars as reported by the gateway. null when the call carried no price. */
  usd: z.number().nonnegative().nullable(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});
export type Cost = z.infer<typeof Cost>;

/** No price is known: a call that threw may have been billed, and a replay ran no model. */
export const UNPRICED: Cost = { usd: null, inputTokens: 0, outputTokens: 0 };

/** The adapters name recorded for a run that called no model. Such a run can never pass a gate. */
export const GOLD_REPLAY = 'gold-replay';

/**
 * Why a call failed, as a closed set of codes. A free-text error could carry prompt or story text
 * from a provider into a run file, so only these codes are stored. report.ts maps each to a fixed
 * sentence.
 */
export const ErrorCode = z.enum(['call_failed', 'invalid_reply', 'timeout', 'no_gold_passage']);
export type ErrorCode = z.infer<typeof ErrorCode>;

export function addCost(a: Cost, b: Cost): Cost {
  return {
    usd: a.usd === null || b.usd === null ? null : a.usd + b.usd,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  };
}

export const VerifierResult = z.object({
  /** The call failed or the reply was invalid. A code only, never model or story text. */
  error: ErrorCode.nullable(),
  /** 1-based questions the verifier answered differently from the key. */
  disagreed: z.array(z.number().int().min(1)),
  flaggedUnsafe: z.boolean(),
});
export type VerifierResult = z.infer<typeof VerifierResult>;

export const CheckOutcome = z.object({
  passed: z.boolean(),
  /** Stable failure codes, such as `too_hard`. Empty when the story passed. */
  failures: z.array(z.string()),
});
export type CheckOutcome = z.infer<typeof CheckOutcome>;

/** One story the pipeline generated for a level. */
export const GeneratedSample = z.object({
  level: Level,
  index: z.number().int().nonnegative(),
  /** Generation failed before any story existed. A code only. */
  error: ErrorCode.nullable(),
  title: z.string().nullable(),
  text: z.string().nullable(),
  words: z.number().int().nonnegative().nullable(),
  readingGrade: z.number().nullable(),
  questions: z.number().int().nonnegative().nullable(),
  /** null when generation failed. */
  checks: CheckOutcome.nullable(),
  /** null when generation or the checks failed, so the verifier never ran. */
  verifier: VerifierResult.nullable(),
  /** Everything this story cost: generation and verification. */
  cost: Cost,
});
export type GeneratedSample = z.infer<typeof GeneratedSample>;

/** One human-labelled case from the gold or safety set, run through the checks and the verifier. */
export const LabelledSample = z.object({
  caseId: z.string(),
  set: z.enum(['gold', 'safety']),
  level: Level,
  questions: z.number().int().positive(),
  wrongKeys: z.array(z.number().int().min(1)),
  unsafe: z.boolean(),
  reviewed: z.boolean(),
  checks: CheckOutcome,
  verifier: VerifierResult,
  cost: Cost,
});
export type LabelledSample = z.infer<typeof LabelledSample>;

export const EvalRun = z.object({
  id: z.string().regex(/^[A-Za-z0-9._-]+$/),
  startedAt: z.iso.datetime(),
  gitSha: z.string().nullable(),
  /** Which adapters produced the stories, such as `gold-replay`. */
  adapters: z.string().min(1),
  /** AI Gateway model strings. null when no model was called. */
  storyModel: z.string().nullable(),
  verifierModel: z.string().nullable(),
  promptVersion: z.string().nullable(),
  /** Unreviewed draft cases were counted. Such a run is a dry run and can never pass a gate. */
  includesDrafts: z.boolean(),
  generated: z.array(GeneratedSample),
  labelled: z.array(LabelledSample),
});
export type EvalRun = z.infer<typeof EvalRun>;
