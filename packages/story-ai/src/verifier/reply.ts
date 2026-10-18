import { z } from 'zod';
import { SAFETY_CATEGORIES, type SafetyCategory } from './prompt';

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
    // Unknown names are accepted here and turned into an unsafe verdict below.
    categories: z.array(z.string()),
    reason: z.string(),
  }),
});
type RawReply = z.infer<typeof VerifierReply>;
export type VerifierReply = Omit<RawReply, 'safety'> & {
  safety: { safe: boolean; categories: SafetyCategory[]; reason: string };
};

function stripFence(text: string): string {
  const match = /^\s*```[a-zA-Z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(text);
  return match ? match[1]! : text;
}

export type ParsedReply = { ok: true; reply: VerifierReply } | { ok: false; reason: string };

/**
 * Turns a raw model reply (a JSON string or an object) into a checked reply. Never throws.
 * Reasons are plain English and never quote the reply, which may echo story text.
 * A reply that says safe but lists categories is treated as unsafe, and so is one that names a
 * category we do not know. Categories are deduplicated. A JSON code fence is stripped first.
 * Missing questions are allowed here: the verdict counts them as disagreements.
 */
export function parseVerifierReply(raw: unknown, questionCount: number): ParsedReply {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(stripFence(raw));
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
  const categories = SAFETY_CATEGORIES.filter((c) => safety.categories.includes(c));
  // Safe only when no category is named at all, known or not.
  const safe = safety.safe && safety.categories.length === 0;
  return {
    ok: true,
    reply: { answers: parsed.data.answers, safety: { safe, categories, reason: safety.reason } },
  };
}
