import { TIERS } from '@basabridge/levels';
import { describe, expect, it } from 'vitest';
import { buildReviewQueue, needsEducatorReview, type ReviewCandidate } from './review-queue';

const NOW = new Date('2026-10-18T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);

/** Small deterministic generator (mulberry32) so queues are repeatable. */
function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const story = (
  id: string,
  level: number,
  over: Partial<ReviewCandidate> = {},
): ReviewCandidate => ({
  id,
  level,
  status: 'active',
  openReports: 0,
  lastReviewedAt: null,
  ...over,
});

/** Five active, unreported stories in every tier. */
const bank = (): ReviewCandidate[] =>
  TIERS.flatMap((t, ti) => [0, 1, 2, 3, 4].map((k) => story(`t${ti}-s${k}`, t.from)));

describe('buildReviewQueue', () => {
  it('puts reported stories first, most reported first', () => {
    const q = buildReviewQueue(
      [...bank(), story('r1', 20, { openReports: 1 }), story('r3', 40, { openReports: 3 })],
      { now: NOW, random: seeded(1) },
    );
    expect(q.slice(0, 2).map((i) => i.storyId)).toEqual(['r3', 'r1']);
    expect(q.slice(0, 2).every((i) => i.why === 'reported')).toBe(true);
  });

  it('samples two stories from every tier by default', () => {
    const q = buildReviewQueue(bank(), { now: NOW, random: seeded(2) });
    expect(q).toHaveLength(TIERS.length * 2);
    TIERS.forEach((_, ti) => {
      expect(q.filter((i) => i.storyId.startsWith(`t${ti}-`))).toHaveLength(2);
    });
  });

  it('takes every story in a tier that has fewer than the sample size', () => {
    const q = buildReviewQueue([story('only', 5)], { now: NOW, random: seeded(3) });
    expect(q.map((i) => i.storyId)).toEqual(['only']);
  });

  it('never includes retired stories, even reported ones', () => {
    const q = buildReviewQueue(
      [
        story('gone', 5, { status: 'retired', openReports: 4 }),
        story('gone2', 5, { status: 'retired' }),
      ],
      { now: NOW, random: seeded(4) },
    );
    expect(q).toEqual([]);
  });

  it('does not sample stories in review or reviewed recently, and lists a story once', () => {
    const q = buildReviewQueue(
      [
        story('busy', 5, { status: 'in_review' }),
        story('fresh', 5, { lastReviewedAt: daysAgo(3) }),
        story('stale', 5, { lastReviewedAt: daysAgo(90) }),
        story('rep', 5, { openReports: 2 }),
      ],
      { now: NOW, random: seeded(5) },
    );
    expect(q.map((i) => i.storyId).sort()).toEqual(['rep', 'stale']);
  });

  it('gives the same queue for the same seed, whatever the input order', () => {
    const a = buildReviewQueue(bank(), { now: NOW, random: seeded(7) });
    const b = buildReviewQueue(bank().reverse(), { now: NOW, random: seeded(7) });
    expect(b).toEqual(a);
  });

  it('respects a custom sample size, including zero', () => {
    expect(buildReviewQueue(bank(), { now: NOW, perTier: 1, random: seeded(8) })).toHaveLength(
      TIERS.length,
    );
    expect(buildReviewQueue(bank(), { now: NOW, perTier: 0 })).toEqual([]);
  });
});

describe('needsEducatorReview', () => {
  const setup = { promptVersion: 'p1', model: 'gemini-a' };

  it('is needed before the first review', () => {
    expect(needsEducatorReview(setup, null)).toBe(true);
  });

  it('is not needed when nothing changed', () => {
    expect(needsEducatorReview(setup, { ...setup })).toBe(false);
  });

  it('is needed after a prompt or model change', () => {
    expect(needsEducatorReview({ ...setup, promptVersion: 'p2' }, setup)).toBe(true);
    expect(needsEducatorReview({ ...setup, model: 'gemini-b' }, setup)).toBe(true);
  });
});
