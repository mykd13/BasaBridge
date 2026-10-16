import type { Story, StoryQuestion } from '@basabridge/contracts';
import type { VerificationRecord } from './metrics';
import { buildVerifierPrompt, toVerifierInput } from './prompt';
import { parseVerifierReply } from './reply';
import { judgeVerification } from './verdict';

/**
 * The model call, passed in so the core is testable with mocked replies. It gets the built prompt
 * and returns the raw reply (a JSON string or an object). Part 2 of BB-17 supplies the real one.
 */
export type CallVerifierModel = (input: { system: string; prompt: string }) => Promise<unknown>;

export interface VerifyDeps {
  callModel: CallVerifierModel;
  /** Called exactly once per verification with counts only. */
  onRecord?: (record: VerificationRecord) => void;
}

export type VerifyOutcome =
  | {
      ok: true;
      questions: StoryQuestion[];
      /** 1-based numbers of questions the checker disagreed on (dropped). */
      disagreed: number[];
      record: VerificationRecord;
    }
  | {
      ok: false;
      kind: 'model_call' | 'invalid_output' | 'rejected';
      /** Plain English. Never holds prompt text, the model error message or learner data. */
      reason: string;
      disagreed: number[];
      /** Safety categories the checker flagged, when it rejected the passage. */
      categories: VerificationRecord['categories'];
      record: VerificationRecord;
    };

/**
 * Asks a second model to answer the questions without the key and to judge child safety, then
 * keeps only the questions it agrees on. The prompt carries the passage, questions and options
 * only. In part 2 these kinds map onto the story error kinds.
 */
export async function verifyStory(
  story: Pick<Story, 'text' | 'level' | 'questions'>,
  deps: VerifyDeps,
): Promise<VerifyOutcome> {
  const questionsIn = story.questions.length;
  const finish = (outcome: VerifyOutcome): VerifyOutcome => {
    deps.onRecord?.(outcome.record);
    return outcome;
  };
  const failure = (
    kind: 'model_call' | 'invalid_output',
    reason: string,
    outcome: 'model_call_failed' | 'invalid_reply',
  ): VerifyOutcome =>
    finish({
      ok: false,
      kind,
      reason,
      disagreed: [],
      categories: [],
      record: {
        level: story.level,
        questionsIn,
        agreed: 0,
        disagreed: 0,
        outcome,
        categories: [],
      },
    });

  const prompt = buildVerifierPrompt(toVerifierInput(story.text, story.questions));

  let raw: unknown;
  try {
    raw = await deps.callModel(prompt);
  } catch {
    // The error message may echo prompt text, so it is dropped.
    return failure('model_call', 'The checker model call failed.', 'model_call_failed');
  }

  const parsed = parseVerifierReply(raw, questionsIn);
  if (!parsed.ok) return failure('invalid_output', parsed.reason, 'invalid_reply');

  const verdict = judgeVerification(story.questions, parsed.reply);
  if (verdict.ok) {
    return finish({
      ok: true,
      questions: verdict.kept,
      disagreed: verdict.disagreed,
      record: {
        level: story.level,
        questionsIn,
        agreed: verdict.kept.length,
        disagreed: verdict.disagreed.length,
        outcome: 'kept',
        categories: [],
      },
    });
  }

  return finish({
    ok: false,
    kind: 'rejected',
    reason: verdict.reason,
    disagreed: verdict.disagreed,
    categories: verdict.categories,
    record: {
      level: story.level,
      questionsIn,
      agreed: questionsIn - verdict.disagreed.length,
      disagreed: verdict.disagreed.length,
      outcome: verdict.outcome,
      categories: verdict.categories,
    },
  });
}
