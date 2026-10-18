/**
 * Generates Learn practice or check items (docs/PLAN.md section 6.3, BB-54). Same pipeline as
 * stories: generate, deterministic checks, independent verifier, retry with the failure reasons,
 * then fail visibly. The model calls are passed in; the real Gemini client comes with BB-15.
 */
import { MAX_STORY_TRIES, failureFeedback } from '../retry';
import type { CheckFailure } from '../checks';
import { verifyStory, type CallVerifierModel, type VerifyDeps } from '../verifier/verify';
import { checkPracticeBatch, type PracticeItem, type SeenItem } from './item';
import { buildPracticePrompt, toPracticePromptInput, type PracticeRequest } from './prompt';

/** The generator model call. Gets the built prompt and returns the raw reply. */
export type CallPracticeModel = (input: { system: string; prompt: string }) => Promise<unknown>;

export interface GeneratePracticeDeps {
  callModel: CallPracticeModel;
  /** A different model from the generator (BB-17). */
  callVerifier: CallVerifierModel;
  /** Defaults to MAX_STORY_TRIES. */
  maxTries?: number;
  verifierTimeoutMs?: number;
  /** Counts only, one per verified item. */
  onRecord?: VerifyDeps['onRecord'];
}

export type GeneratePracticeResult =
  | { ok: true; items: PracticeItem[]; tries: number }
  | {
      ok: false;
      /** Items that passed everything before the tries ran out. The caller may still use them. */
      items: PracticeItem[];
      failures: CheckFailure[];
      tries: number;
    };

/** The verifier needs a title; practice items have none a learner sees. */
const VERIFIER_TITLE = 'Practice';

/**
 * Asks for the missing items until `count` have passed the checks and the verifier, or the tries
 * run out. A check item never repeats `avoid` (the practice items) or another item.
 */
export async function generatePracticeItems(
  request: PracticeRequest,
  deps: GeneratePracticeDeps,
): Promise<GeneratePracticeResult> {
  const spec = { kind: request.kind, level: request.level, subskill: request.subskill };
  const limit = Math.max(1, Math.floor(deps.maxTries ?? MAX_STORY_TRIES));
  const items: PracticeItem[] = [];
  let failures: CheckFailure[] = [];
  let retryReason: string | undefined;

  for (let tries = 1; tries <= limit; tries++) {
    const avoid: SeenItem[] = [
      ...(request.avoid ?? []),
      ...items.map((i) => ({ passage: i.passage, question: i.question.question })),
    ];
    const prompt = buildPracticePrompt(
      toPracticePromptInput({ ...request, count: request.count - items.length, avoid }),
      retryReason,
    );

    let raw: unknown;
    try {
      raw = await deps.callModel(prompt);
    } catch {
      // The error message may echo prompt text, so it is dropped.
      failures = [{ code: 'not_verified', message: 'The generator model call failed.' }];
      retryReason = undefined;
      continue;
    }

    const batch = checkPracticeBatch(raw, spec, avoid);
    failures = [...batch.dropped];
    for (const item of batch.items) {
      if (items.length >= request.count) break;
      const verified = await verifyStory(
        {
          title: VERIFIER_TITLE,
          text: item.passage,
          level: item.level,
          questions: [item.question],
          notes: [item.hint, item.explanation].filter((n): n is string => n !== null),
        },
        {
          callModel: deps.callVerifier,
          minQuestions: 1,
          timeoutMs: deps.verifierTimeoutMs,
          onRecord: deps.onRecord,
        },
      );
      if (verified.ok) items.push(item);
      // No question number: the reason already names the checker's numbering, which is per item.
      else failures.push({ code: 'not_verified', message: verified.reason });
    }

    if (items.length >= request.count) return { ok: true, items, tries };
    retryReason = failureFeedback(failures) || undefined;
  }

  return { ok: false, items, failures, tries: limit };
}
