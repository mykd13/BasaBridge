const VOWELS = 'aeiouy';

const isVowel = (ch: string) => VOWELS.includes(ch);

/**
 * Split a word into chunks for display ("patient" -> "pa", "tient").
 * Display only: it is a simple vowel-group rule, not a dictionary syllabifier.
 */
export function splitIntoChunks(word: string): string[] {
  const w = word.trim().toLowerCase();
  if (w.length === 0) return [];

  // Find the vowel groups, then cut in the consonants between them.
  const groups: Array<[number, number]> = [];
  for (let i = 0; i < w.length; i++) {
    if (!isVowel(w.charAt(i))) continue;
    const start = i;
    while (i + 1 < w.length && isVowel(w.charAt(i + 1))) i++;
    groups.push([start, i]);
  }

  // A silent final "e" after a consonant is not its own chunk.
  const last = groups[groups.length - 1];
  if (
    groups.length > 1 &&
    last &&
    last[0] === last[1] &&
    last[0] === w.length - 1 &&
    w.endsWith('e')
  ) {
    groups.pop();
  }
  if (groups.length < 2) return [w];

  const cuts: number[] = [];
  for (let g = 0; g < groups.length - 1; g++) {
    const prev = groups[g];
    const next = groups[g + 1];
    if (!prev || !next) continue;
    const consonants = next[0] - prev[1] - 1;
    // One consonant goes with the next chunk (pa|tient), more are shared (rab|bit).
    cuts.push(consonants <= 1 ? prev[1] + 1 : prev[1] + 1 + Math.floor(consonants / 2));
  }

  const chunks: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    chunks.push(w.slice(from, cut));
    from = cut;
  }
  chunks.push(w.slice(from));
  return chunks.filter((c) => c.length > 0);
}
