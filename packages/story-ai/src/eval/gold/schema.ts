/**
 * Shape of a human-labelled evaluation case (BB-21). Gold cases are safe passages with correct
 * answer keys, sometimes with keys planted wrong on purpose. Safety cases are passages a children's
 * reading app must reject. Both carry story text, a level and labels only. Never learner data.
 *
 * The fields `id`, `story`, `wrongKeys` and `unsafe` match the verifier's GoldCase (BB-17), so these
 * cases can be passed straight to measureVerifier once it lands.
 */
import { Level, StoryQuestion } from '@basabridge/contracts';
import { z } from 'zod';

export const SafetyCategory = z.enum([
  'violence',
  'dangerous_activity',
  'frightening',
  'unkind_language',
  'stranger_contact',
]);
export type SafetyCategory = z.infer<typeof SafetyCategory>;

export const GoldStory = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  level: Level,
  questions: z.array(StoryQuestion).min(4),
});
export type GoldStory = z.infer<typeof GoldStory>;

export const CaseSource = z.enum(['drafted', 'hand-written', 'generated']);
export type CaseSource = z.infer<typeof CaseSource>;

const collapse = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

export const GoldCase = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, digits and dashes.'),
    story: GoldStory,
    /** 1-based questions whose key a human planted wrong. */
    wrongKeys: z.array(z.number().int().min(1)),
    /** Human safety label. */
    unsafe: z.boolean(),
    /** Why the passage is unsafe. Set exactly when `unsafe` is true. */
    safetyCategory: SafetyCategory.nullable(),
    /** drafted: written by an AI assistant and not yet trusted. */
    source: CaseSource,
    /** A role or initials of the person who checked the case, never a learner. null until checked. */
    reviewedBy: z.string().min(1).nullable(),
    reviewedAt: z.iso.date().nullable(),
  })
  .superRefine((c, ctx) => {
    const text = collapse(c.story.text);
    c.story.questions.forEach((q, i) => {
      if (!text.includes(collapse(q.evidence))) {
        ctx.addIssue({
          code: 'custom',
          path: ['story', 'questions', i, 'evidence'],
          message: `Question ${i + 1}: the evidence sentence is not in the passage.`,
        });
      }
    });
    const n = c.story.questions.length;
    if (c.wrongKeys.some((k) => k > n) || new Set(c.wrongKeys).size !== c.wrongKeys.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['wrongKeys'],
        message: `wrongKeys must be distinct question numbers from 1 to ${n}.`,
      });
    }
    if (c.unsafe !== (c.safetyCategory !== null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['safetyCategory'],
        message: 'Set safetyCategory exactly when the case is unsafe.',
      });
    }
    if ((c.reviewedBy === null) !== (c.reviewedAt === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['reviewedAt'],
        message: 'Set reviewedBy and reviewedAt together.',
      });
    }
  });
export type GoldCase = z.infer<typeof GoldCase>;

/** Parses a whole set and checks that ids are unique. Throws with every problem listed. */
export function parseCases(raw: unknown[]): GoldCase[] {
  const cases = z.array(GoldCase).parse(raw);
  const seen = new Set<string>();
  for (const c of cases) {
    if (seen.has(c.id)) throw new Error(`Duplicate case id: ${c.id}`);
    seen.add(c.id);
  }
  return cases;
}

export const isReviewed = (c: GoldCase): boolean => c.reviewedBy !== null;

/** Only cases a person has checked count in metrics and gates. */
export const reviewedCases = (cases: GoldCase[]): GoldCase[] => cases.filter(isReviewed);

/**
 * A copy of a safe case with the keys of some questions moved to the next option, so the verifier
 * should disagree with exactly those questions.
 */
export function withWrongKeys(base: GoldCase, questionNumbers: number[]): GoldCase {
  return {
    ...base,
    id: `${base.id}-wrong-${questionNumbers.join('-')}`,
    wrongKeys: [...questionNumbers],
    story: {
      ...base.story,
      questions: base.story.questions.map((q, i) =>
        questionNumbers.includes(i + 1) ? { ...q, answerIndex: (q.answerIndex + 1) % 4 } : q,
      ),
    },
  };
}
