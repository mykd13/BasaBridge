/**
 * Cached practice and check items for a lesson (docs/PLAN.md section 6.3, BB-54). Items are
 * generated and verified in `story-ai`, cached per lesson and band, and reused. This file decides
 * which cached items a learner gets and how many still need generating. It never moves a level.
 */
import type { Band } from './lesson';

export type PracticeItemKind = 'practice' | 'check';

/** A cached item. `content` is the verified item from `story-ai`, stored as is. */
export interface CachedPracticeItem<C = unknown> {
  id: string;
  lessonId: string;
  band: Band;
  kind: PracticeItemKind;
  /** The level the item was written for. Its passage fits that level's reading grade. */
  level: number;
  passage: string;
  question: string;
  /** Set by the item calibration rules shared with story questions (BB-45). Never shown again. */
  retired: boolean;
  content: C;
}

/** Where cached items live. The database table needs a `packages/db` change (Rhett). */
export interface PracticeItemStore<C = unknown> {
  list(lessonId: string, band: Band, kind: PracticeItemKind): Promise<CachedPracticeItem<C>[]>;
  save(items: Omit<CachedPracticeItem<C>, 'id' | 'retired'>[]): Promise<CachedPracticeItem<C>[]>;
}

/** Text already used, so it is not shown again. */
export interface UsedItem {
  passage: string;
  question: string;
}

const normalise = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/**
 * Drops items whose passage or question repeats a used item or an earlier item in the list.
 * Check items run through this with the practice items as `used`, so a check is always fresh.
 */
export function withoutRepeats<T extends UsedItem>(
  items: readonly T[],
  used: readonly UsedItem[],
): T[] {
  const passages = new Set(used.map((u) => normalise(u.passage)));
  const questions = new Set(used.map((u) => normalise(u.question)));
  const kept: T[] = [];
  for (const item of items) {
    const p = normalise(item.passage);
    const q = normalise(item.question);
    if (passages.has(p) || questions.has(q)) continue;
    passages.add(p);
    questions.add(q);
    kept.push(item);
  }
  return kept;
}

export interface SelectInput {
  /** The learner's level. Items written above it are too hard to reuse. */
  level: number;
  count: number;
  /** Items the learner already saw in this lesson. For a check, the practice items. */
  used?: readonly UsedItem[];
}

export interface Selection<C> {
  items: CachedPracticeItem<C>[];
  /** How many more to generate with `generatePracticeItems`, then save to the store. */
  missing: number;
}

/**
 * Picks cached items for a learner: not retired, written at or below the learner's level (closest
 * first, so they still stretch the learner), and never repeating `used` or each other.
 */
export function selectPracticeItems<C>(
  cached: readonly CachedPracticeItem<C>[],
  input: SelectInput,
): Selection<C> {
  const usable = cached
    .filter((i) => !i.retired && i.level <= input.level)
    .sort((a, b) => b.level - a.level);
  const items = withoutRepeats(usable, input.used ?? []).slice(0, Math.max(0, input.count));
  return { items, missing: Math.max(0, input.count - items.length) };
}
