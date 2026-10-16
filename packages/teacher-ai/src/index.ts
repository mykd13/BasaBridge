/**
 * Teacher notes written by the AI from facts that code has already worked out
 * (docs/PLAN.md section 7). Owner: Jhade (BB-20, BB-28).
 * Names, usernames and audio are never sent to the model.
 * Seed: the standard fallback activities and the output validator.
 */
import type { ComprehensionSkill, HomeActivity } from '@basabridge/contracts';

/** Used whenever the AI call fails or returns something that does not validate. */
export const STANDARD_ACTIVITIES: Record<ComprehensionSkill, HomeActivity> = {
  vocabulary: {
    title: 'Word detective',
    minutes: 5,
    steps: [
      'Pick three words from the story that felt tricky.',
      'Ask: "What do you think it means? Which words nearby help you?"',
      'Use each word in a new sentence about your day.',
    ],
    tip: 'Say the meaning in your own words before you reach for a dictionary.',
    source: 'standard',
  },
  literal: {
    title: 'Find it in the text',
    minutes: 5,
    steps: [
      'Reread one paragraph of the story together.',
      'Ask a who, what or where question about it.',
      'Have your child point to the exact words that answer it.',
    ],
    tip: 'Pointing at the words trains the habit of checking the text.',
    source: 'standard',
  },
  inferential: {
    title: 'Clue hunt',
    minutes: 7,
    steps: [
      'Read two or three sentences together.',
      'Ask: "What is not said, but you can tell?"',
      'Ask: "Which words gave you that clue?" and find them.',
    ],
    tip: 'There is no single right answer if the child can name a clue from the text.',
    source: 'standard',
  },
};

export function standardActivity(focus: ComprehensionSkill | null): HomeActivity {
  return STANDARD_ACTIVITIES[focus ?? 'literal'];
}

export interface TeacherNotes {
  childMessage: string;
  whatHappened: string;
  whyFocus: string;
  homeActivity: HomeActivity;
  source: 'ai' | 'rule';
}

const within = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim() !== '' && v.length <= max;

/** Shape and length check for model output. Anything that fails falls back to standard wording. */
export function isValidNotes(p: unknown): boolean {
  const n = p as Record<string, unknown> | null;
  const h = (n?.homeActivity ?? null) as Record<string, unknown> | null;
  return (
    !!n &&
    within(n.childMessage, 320) &&
    within(n.whatHappened, 500) &&
    within(n.whyFocus, 320) &&
    !!h &&
    within(h.title, 60) &&
    Array.isArray(h.steps) &&
    h.steps.length >= 2 &&
    h.steps.length <= 4 &&
    h.steps.every((s) => within(s, 240)) &&
    within(h.tip, 240)
  );
}

export interface NotesInput {
  /** Counts and missed questions only. No names. */
  focus: ComprehensionSkill | null;
  correct: number;
  total: number;
}

/** Implemented in BB-20: call the model, validate with isValidNotes, fall back to standard wording. */
export async function writeNotes(_input: NotesInput): Promise<TeacherNotes> {
  throw new Error('writeNotes is not implemented yet (BB-20)');
}
