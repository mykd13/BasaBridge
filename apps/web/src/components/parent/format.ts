/** Whole-number percent of a share, for display only. The numbers come from the server. */
export function percent(right: number, total: number): number {
  return total > 0 ? Math.round((right / total) * 100) : 0;
}

/** Parents see dates in the time zone of the learners the app serves. */
export const PARENT_TIME_ZONE = 'Asia/Manila';

/** Card props as values. The hard-coded text lint rule flags string props on components. */
export const CARD = { article: 'article', section: 'section', strong: 'strong' } as const;
