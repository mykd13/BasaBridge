/**
 * Topic seeds and title checks for story generation (BB-15).
 * Seeds are short, child-safe and set in everyday life for young readers in the Philippines.
 * No real people. The caller stores recent topics and titles and passes them in (BB-18).
 */

export const TOPIC_SEEDS: readonly string[] = Object.freeze([
  'a mango tree at home',
  'a rainy school day',
  'a trip to the market',
  'a lost slipper',
  'helping grandmother cook rice',
  'a fishing boat at sunrise',
  'a school garden',
  'a new puppy on the street',
  'a jeepney ride',
  'a power cut at night',
  'a birthday with a small cake',
  'a kite on a windy day',
  'a pot of soup for a sick friend',
  'a big flood and a safe house',
  'a class play',
  'a trip to the beach',
  'a broken umbrella',
  'a hen and her chicks',
  'a neighbour who shares fruit',
  'a game of tumbang preso',
  'a visit to the town library',
  'a lantern for the Christmas season',
  'a school bus that is late',
  'a carabao in the rice field',
  'a drawing contest',
  'a lost coin',
  'a first day at a new school',
  'a sari-sari store on the corner',
  'a rainbow after the rain',
  'a seed that grows into a plant',
]);

/**
 * Picks a seed at random among those not in `recentTopics`. If every seed is recent, picks among
 * the least recent ones (`recentTopics` is ordered most recent first). Never throws.
 */
export function pickTopic(recentTopics: string[], random: () => number = Math.random): string {
  const norm = (s: string) => s.trim().toLowerCase();
  const recentIndex = new Map<string, number>();
  recentTopics.forEach((t, i) => {
    if (!recentIndex.has(norm(t))) recentIndex.set(norm(t), i);
  });
  const unused = TOPIC_SEEDS.filter((s) => !recentIndex.has(norm(s)));
  let pool: readonly string[] = unused;
  if (pool.length === 0) {
    const oldest = Math.max(...TOPIC_SEEDS.map((s) => recentIndex.get(norm(s)) ?? 0));
    pool = TOPIC_SEEDS.filter((s) => (recentIndex.get(norm(s)) ?? 0) === oldest);
  }
  const r = Math.min(Math.max(random(), 0), 0.999999999);
  return pool[Math.floor(r * pool.length)] ?? TOPIC_SEEDS[0]!;
}

const normaliseTitle = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '');

/** True when `title` matches a recent title, ignoring case, punctuation and a leading the/a/an. */
export function isRecentTitle(title: string, recentTitles: string[]): boolean {
  const t = normaliseTitle(title);
  return t !== '' && recentTitles.some((r) => normaliseTitle(r) === t);
}
