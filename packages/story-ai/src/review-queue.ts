/**
 * Which stories a human reviews next (BB-42): every reported story, then a random sample from each
 * level tier. Pure: the caller loads story records and passes them in. Tiers come from packages/levels.
 */
import { TIERS, tierFor } from '@basabridge/levels';

/** Stories sampled from each tier when no report points at them. To be confirmed with BB-74. */
export const REVIEW_SAMPLE_PER_TIER = 2;
/** A story reviewed within this many days is not sampled again. */
export const RECENT_REVIEW_DAYS = 30;

export type StoryStatus = 'active' | 'in_review' | 'retired';

export interface ReviewCandidate {
  id: string;
  level: number;
  status: StoryStatus;
  /** Reports not yet handled by a review. */
  openReports: number;
  lastReviewedAt: Date | null;
}

export interface ReviewQueueItem {
  storyId: string;
  level: number;
  why: 'reported' | 'sampled';
  openReports: number;
}

export interface ReviewQueueOptions {
  now: Date;
  perTier?: number;
  recentDays?: number;
  /** Returns a number in [0, 1). Pass a seeded one in tests. */
  random?: () => number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildReviewQueue(
  stories: readonly ReviewCandidate[],
  options: ReviewQueueOptions,
): ReviewQueueItem[] {
  const perTier = options.perTier ?? REVIEW_SAMPLE_PER_TIER;
  const recentMs = (options.recentDays ?? RECENT_REVIEW_DAYS) * DAY_MS;
  const random = options.random ?? Math.random;
  // Sorted by id so the result depends only on the stories and the random source, not input order.
  const sorted = [...stories].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const reported = sorted
    .filter((s) => s.status !== 'retired' && s.openReports > 0)
    .sort((a, b) => b.openReports - a.openReports)
    .map((s): ReviewQueueItem => ({
      storyId: s.id,
      level: s.level,
      why: 'reported',
      openReports: s.openReports,
    }));

  const byTier = new Map<number, ReviewCandidate[]>();
  for (const s of sorted) {
    if (s.status !== 'active' || s.openReports > 0) continue;
    if (s.lastReviewedAt && options.now.getTime() - s.lastReviewedAt.getTime() < recentMs) continue;
    const tier = TIERS.indexOf(tierFor(s.level));
    byTier.set(tier, [...(byTier.get(tier) ?? []), s]);
  }

  const sampled: ReviewQueueItem[] = [];
  for (let tier = 0; tier < TIERS.length; tier++) {
    for (const s of pick(byTier.get(tier) ?? [], perTier, random)) {
      sampled.push({ storyId: s.id, level: s.level, why: 'sampled', openReports: 0 });
    }
  }
  return [...reported, ...sampled];
}

/** Partial Fisher-Yates: n items chosen uniformly without replacement. */
function pick<T>(items: readonly T[], n: number, random: () => number): T[] {
  const a = [...items];
  const take = Math.min(Math.max(0, n), a.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(random() * (a.length - i));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a.slice(0, take);
}

/** What produced the stories in the bank. A change to either means stories need a fresh look. */
export interface GenerationSetup {
  promptVersion: string;
  model: string;
}

/**
 * An educator reviews a sample from each tier before the pilot and after any prompt or model change.
 * `lastReview` is the setup in place at the last completed educator review, or null if none yet.
 */
export function needsEducatorReview(
  current: GenerationSetup,
  lastReview: GenerationSetup | null,
): boolean {
  if (!lastReview) return true;
  return current.promptVersion !== lastReview.promptVersion || current.model !== lastReview.model;
}
