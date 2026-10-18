/**
 * Which lessons exist and which still need writing or review (BB-53). BB-53 is done when every
 * slot is reviewed: one lesson per sub-skill, plus word practice and decoding, in each band.
 * Run `pnpm --filter @basabridge/learn coverage` to print the table.
 */
import { SubSkill } from '@basabridge/contracts';
import { Band, Lesson, type LessonSubject } from './lesson';

export const LESSON_SUBJECTS: readonly LessonSubject[] = [
  ...SubSkill.options,
  'word_practice',
  'decoding',
];

export type SlotState = 'missing' | 'draft' | 'reviewed';

export interface CoverageSlot {
  subject: LessonSubject;
  band: Band;
  state: SlotState;
  /** Ids of the lessons filling this slot. More than one is allowed. */
  lessonIds: string[];
}

export interface LessonCoverage {
  slots: CoverageSlot[];
  counts: Record<SlotState, number>;
  /** True when every slot has a reviewed lesson. */
  complete: boolean;
}

/**
 * Coverage of the lesson files. A slot is reviewed when any of its lessons is reviewed, a draft
 * when it has only drafts, and missing otherwise. Files that do not parse are left to the registry
 * test, which fails on them.
 */
export function lessonCoverage(files: readonly unknown[]): LessonCoverage {
  const lessons = files.flatMap((f) => {
    const parsed = Lesson.safeParse(f);
    return parsed.success ? [parsed.data] : [];
  });
  const slots = Band.options.flatMap((band) =>
    LESSON_SUBJECTS.map((subject): CoverageSlot => {
      const here = lessons.filter((l) => l.band === band && l.subject === subject);
      const state: SlotState = here.some((l) => l.status === 'reviewed')
        ? 'reviewed'
        : here.length > 0
          ? 'draft'
          : 'missing';
      return { subject, band, state, lessonIds: here.map((l) => l.id) };
    }),
  );
  const counts: Record<SlotState, number> = { missing: 0, draft: 0, reviewed: 0 };
  for (const s of slots) counts[s.state] += 1;
  return { slots, counts, complete: counts.reviewed === slots.length };
}

/** The coverage as a plain text table, one row per subject and one column per band. */
export function formatCoverage(c: LessonCoverage): string {
  const width = Math.max(...LESSON_SUBJECTS.map((s) => s.length)) + 2;
  const col = 10;
  const header = (
    'subject'.padEnd(width) + Band.options.map((b) => b.padEnd(col)).join('')
  ).trimEnd();
  const rows = LESSON_SUBJECTS.map(
    (subject) =>
      subject.padEnd(width) +
      Band.options
        .map((band) => c.slots.find((s) => s.subject === subject && s.band === band)!.state)
        .map((state) => state.padEnd(col))
        .join(''),
  );
  const total = c.slots.length;
  const summary = `${c.counts.reviewed} of ${total} reviewed, ${c.counts.draft} draft, ${c.counts.missing} missing`;
  return [header, ...rows.map((r) => r.trimEnd()), '', summary].join('\n');
}
