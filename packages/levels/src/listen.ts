/**
 * Listen-then-read rules (docs/PLAN.md section 6.4, ADR 0004).
 * The learner hears the story read slowly with the words highlighted, then reads it.
 * Placeholders to tune with real learners. Keep every number here and nowhere else.
 */
export const LISTEN_THEN_READ = {
  /** Offered only at this level and below. */
  maxLevel: 10,
  /** Model voice speed, where 1 is a normal reading pace. */
  pace: 0.7,
} as const;

export interface ListenContext {
  level: number;
  /** True while the learner is taking the placement test. */
  inPlacement: boolean;
  /** The learner's own setting. Defaults to on. */
  enabled: boolean;
}

/** Whether to offer listen-then-read before a try. Never in placement, never above the max level. */
export function listenThenReadAllowed(c: ListenContext): boolean {
  return c.enabled && !c.inPlacement && c.level <= LISTEN_THEN_READ.maxLevel;
}

/**
 * Whether a try counts as supported: listening was allowed and the learner listened first.
 * A learner who turned the setting off, or skipped the audio, makes a normal try.
 */
export function isSupportedTry(c: ListenContext & { listened: boolean }): boolean {
  return c.listened && listenThenReadAllowed(c);
}

/** Label shown beside words right on a supported try. The wording comes from the i18n catalog. */
export type WordsRightLabel = 'after_listening' | null;

export function wordsRightLabel(supportedTry: boolean): WordsRightLabel {
  return supportedTry ? 'after_listening' : null;
}
