import { z } from 'zod';
import { SAFETY_CATEGORIES } from './prompt';

export const VerifierReply = z.object({
  answers: z.array(
    z.object({
      /** 1-based question number, as shown in the prompt. */
      question: z.number().int().min(1),
      answerIndex: z.number().int().min(0).max(3),
    }),
  ),
  safety: z.object({
    safe: z.boolean(),
    categories: z.array(z.enum(SAFETY_CATEGORIES)),
    reason: z.string(),
  }),
});
export type VerifierReply = z.infer<typeof VerifierReply>;

export type ParsedReply = { ok: true; reply: VerifierReply } | { ok: false; reason: string };

/**
 * Turns a raw model reply (a JSON string or an object) into a checked reply. Never throws.
 * Reasons are plain English and never quote the reply, which may echo story text.
 * A reply that says safe but lists categories is treated as unsafe.
 * Missing questions are allowed here: the verdict counts them as disagreements.
 */
export function parseVerifierReply(raw: unknown, questionCount: number): ParsedReply {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'The checker reply was not valid JSON.' };
    }
  }

  const parsed = VerifierReply.safeParse(value);
  if (!parsed.success) {
    return { ok: false, reason: 'The checker reply did not match the expected shape.' };
  }

  const seen = new Set<number>();
  for (const { question } of parsed.data.answers) {
    if (question > questionCount) {
      return { ok: false, reason: 'The checker answered a question that does not exist.' };
    }
    if (seen.has(question)) {
      return { ok: false, reason: 'The checker answered the same question twice.' };
    }
    seen.add(question);
  }

  const { safety } = parsed.data;
  const reply: VerifierReply =
    safety.safe && safety.categories.length > 0
      ? { ...parsed.data, safety: { ...safety, safe: false } }
      : parsed.data;
  return { ok: true, reply };
}
