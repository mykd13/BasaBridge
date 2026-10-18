/**
 * Report and retire rates for the story bank (BB-42), for the evaluation harness (BB-21).
 * Counts only: no learner ids, names or answers go in or come out.
 */
import { TIERS, tierFor } from '@basabridge/levels';

/** Counts for one story over a period. */
export interface StoryContentCounts {
  level: number;
  promptVersion: string;
  model: string;
  /** Times the story was given to a learner. */
  served: number;
  /** Reports received. */
  reported: number;
  retired: boolean;
}

export type RateGroupBy = 'tier' | 'promptVersion' | 'model';

export interface ContentRates {
  group: string;
  stories: number;
  served: number;
  reported: number;
  retired: number;
  /** Reports per story served. Null when nothing was served. */
  reportRate: number | null;
  /** Share of stories retired. Null when there are no stories. */
  retireRate: number | null;
}

function groupKey(row: StoryContentCounts, groupBy: RateGroupBy): string {
  if (groupBy === 'tier') {
    const t = tierFor(row.level);
    return `${t.from}-${t.to}`;
  }
  return row[groupBy];
}

/** Rates per group, sorted by tier order for tiers and by name otherwise. */
export function contentRates(
  rows: readonly StoryContentCounts[],
  groupBy: RateGroupBy,
): ContentRates[] {
  const groups = new Map<string, ContentRates>();
  for (const row of rows) {
    const key = groupKey(row, groupBy);
    const g = groups.get(key) ?? {
      group: key,
      stories: 0,
      served: 0,
      reported: 0,
      retired: 0,
      reportRate: null,
      retireRate: null,
    };
    g.stories += 1;
    g.served += row.served;
    g.reported += row.reported;
    g.retired += row.retired ? 1 : 0;
    groups.set(key, g);
  }
  const order =
    groupBy === 'tier'
      ? (key: string) => TIERS.findIndex((t) => `${t.from}-${t.to}` === key)
      : null;
  return [...groups.values()]
    .map((g) => ({
      ...g,
      reportRate: g.served > 0 ? g.reported / g.served : null,
      retireRate: g.stories > 0 ? g.retired / g.stories : null,
    }))
    .sort((a, b) =>
      order ? order(a.group) - order(b.group) : a.group < b.group ? -1 : a.group > b.group ? 1 : 0,
    );
}
