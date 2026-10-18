import type { StoryQuestion } from '@basabridge/contracts';
import type { SafetyCategory } from './prompt';
import type { VerifierReply } from './reply';

// TODO(BB-17 part 2): use BB-16's constant so the rule lives in one place.
export const MIN_QUESTIONS = 4;

export type Verdict =
  | { ok: true; kept: StoryQuestion[]; disagreed: number[] }
  | {
      ok: false;
      outcome: 'rejected_unsafe' | 'rejected_too_few';
      /** Plain English and short enough to use as the retry reason. */
      reason: string;
      /** 1-based question numbers. */
      disagreed: number[];
      categories: SafetyCategory[];
    };

function listNumbers(numbers: number[]): string {
  if (numbers.length <= 1) return numbers.join('');
  return `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

/**
 * Keeps only the questions where the checker picked the same option as the key.
 * Safety comes first: an unsafe passage is rejected even when every answer agrees.
 * A question the checker did not answer counts as a disagreement.
 */
export function judgeVerification(questions: StoryQuestion[], reply: VerifierReply): Verdict {
  const answerFor = new Map(reply.answers.map((a) => [a.question, a.answerIndex]));

  const kept: StoryQuestion[] = [];
  const disagreed: number[] = [];
  questions.forEach((q, i) => {
    if (answerFor.get(i + 1) === q.answerIndex) kept.push(q);
    else disagreed.push(i + 1);
  });

  const { safe, categories } = reply.safety;
  if (!safe || categories.length > 0) {
    const named = categories.length > 0 ? `: ${categories.join(', ')}` : '';
    return {
      ok: false,
      outcome: 'rejected_unsafe',
      reason: `The passage was flagged as not safe for children${named}.`,
      disagreed,
      categories,
    };
  }

  if (kept.length < MIN_QUESTIONS) {
    const what =
      disagreed.length === 0
        ? `The story had only ${kept.length} questions, and at least ${MIN_QUESTIONS} are needed.`
        : `The checker did not confirm the answer key on question${disagreed.length === 1 ? '' : 's'} ${listNumbers(disagreed)}, leaving ${kept.length}.`;
    return { ok: false, outcome: 'rejected_too_few', reason: what, disagreed, categories: [] };
  }

  return { ok: true, kept, disagreed };
}
