/**
 * The independent verifier (docs/PLAN.md section 7 step 3, ADR 0003). Owner: Jhade (BB-17, BB-43).
 * The verifier never sees the answer key or the generator's distractor labels. It answers each
 * question and labels each wrong option itself. Code keeps a question only when both agree:
 * that is how the verifier judges whether the distractor labels are honest.
 * Privacy: the prompt carries the passage and the questions only. No learner data.
 */
import { DistractorType } from '@basabridge/contracts';
import { z } from 'zod';
import { DISTRACTOR_MEANING } from './prompt';
import type { TaggedQuestion } from './tags';

/** What the verifier must return. Anything else fails closed. */
export const VerifierVerdict = z.object({
  /** Child safety for the whole story. */
  safe: z.boolean(),
  safetyNote: z.string().nullable(),
  answers: z.array(
    z.object({
      answerIndex: z.number().int().min(0).max(3),
      /** One entry per option. null for the option the verifier chose. */
      labels: z.array(DistractorType.nullable()).length(4),
    }),
  ),
});
export type VerifierVerdict = z.infer<typeof VerifierVerdict>;

export function buildVerifierPrompt(text: string, questions: TaggedQuestion[]): string {
  const qs = questions.map((q, i) =>
    [`Question ${i + 1}: ${q.question}`, ...q.options.map((o, j) => `  ${j}. ${o}`)].join('\n'),
  );
  return [
    'You check reading questions written for a child. Read the story, then answer each question.',
    'Use only the story. Do not guess from outside knowledge.',
    '',
    'For each question give "answerIndex", the option the story supports.',
    'Then give "labels": one entry per option, in option order. Use null for your answer.',
    'For each other option, give the type that best says why it is wrong:',
    Object.entries(DISTRACTOR_MEANING)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    '',
    'Also say whether the story and questions are safe and suitable for a child aged 6 to 12.',
    'If not, set "safe" to false and say why in "safetyNote". Otherwise "safetyNote" is null.',
    '',
    'Reply with JSON only, in this shape:',
    '{"safe": boolean, "safetyNote": string | null, "answers": [{"answerIndex": 0 | 1 | 2 | 3, "labels": [4 entries, null or a type]}]}',
    'Give exactly one entry in "answers" per question, in question order.',
    '',
    'Story:',
    text.trim(),
    '',
    qs.join('\n\n'),
  ].join('\n');
}

export type VerdictResult =
  { ok: true; questions: TaggedQuestion[]; dropped: number } | { ok: false; reason: string };

/** True when the verifier gave every wrong option the same type the generator did. */
export function labelsHonest(q: TaggedQuestion, labels: (DistractorType | null)[]): boolean {
  return q.distractors.every((d, i) => d === labels[i]);
}

/**
 * Applies the verifier's reply to checked questions. Keeps a question only when the verifier
 * picked the keyed answer and its labels match the generator's. Fails when the reply is invalid,
 * the story is unsafe, or fewer than four questions remain.
 */
export function applyVerdict(questions: TaggedQuestion[], rawVerdict: unknown): VerdictResult {
  const parsed = VerifierVerdict.safeParse(rawVerdict);
  if (!parsed.success) return { ok: false, reason: 'The verifier reply was not valid.' };
  const verdict = parsed.data;
  if (!verdict.safe) {
    return {
      ok: false,
      reason: `The verifier flagged the story: ${verdict.safetyNote ?? 'unsafe'}.`,
    };
  }
  if (verdict.answers.length !== questions.length) {
    return { ok: false, reason: 'The verifier did not answer every question.' };
  }
  const kept = questions.filter((q, i) => {
    const a = verdict.answers[i]!;
    return a.answerIndex === q.answerIndex && labelsHonest(q, a.labels);
  });
  if (kept.length < 4) {
    return {
      ok: false,
      reason: `The verifier agreed with ${kept.length} questions; need at least 4.`,
    };
  }
  return { ok: true, questions: kept, dropped: questions.length - kept.length };
}
