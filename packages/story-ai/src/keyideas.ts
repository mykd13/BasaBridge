/**
 * Key ideas for the spoken retell experiment (BB-46, docs/PLAN.md section 6.1).
 * Each generated story lists the ideas a good retell should mention. A key idea is a short
 * sentence plus cue groups: the idea counts as retold when every group has at least one of its
 * words in the retell. Scoring lives in packages/mastery; this file only checks the list.
 *
 * Key ideas are not in the Story contract yet. The type lives here until packages/contracts
 * agrees a field for it.
 */

export interface KeyIdea {
  /** The idea in one short sentence, for the human checking a retell. Never shown to a learner. */
  idea: string;
  /** Each group is a set of words where any one counts, e.g. ["lost", "missing"]. */
  cues: string[][];
}

/** Raw key idea as returned by a model, before any trust. */
export interface RawKeyIdea {
  idea?: unknown;
  cues?: unknown;
}

export const KEY_IDEA_RULES = {
  /** Fewest key ideas a story may keep. Fewer than this and the story fails. */
  min: 3,
  /** Most key ideas a story keeps. Extra ones are dropped. */
  max: 6,
  maxGroups: 4,
  maxWordsPerGroup: 4,
} as const;

export type KeyIdeasResult =
  { ok: true; keyIdeas: KeyIdea[]; dropped: number } | { ok: false; reason: string };

const WORD = /^[a-z][a-z'-]*$/;

const trim = (w: string) => w.replace(/^['-]+|['-]+$/g, '');

const passageWords = (text: string) =>
  new Set(
    (
      text
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .match(/[a-z][a-z'-]*/g) ?? []
    ).map(trim),
  );

function cleanGroup(group: unknown): string[] | null {
  if (!Array.isArray(group) || group.length === 0) return null;
  if (group.length > KEY_IDEA_RULES.maxWordsPerGroup) return null;
  const words: string[] = [];
  for (const w of group) {
    if (typeof w !== 'string') return null;
    const word = trim(w.trim().toLowerCase().replace(/[‘’]/g, "'"));
    if (!WORD.test(word)) return null;
    if (!words.includes(word)) words.push(word);
  }
  return words;
}

/**
 * Deterministic checks on a story's key ideas: the idea is a sentence, there are one to four cue
 * groups of one to four single words, and every group has at least one word that appears in the
 * passage, so each idea is anchored in the text. Duplicate ideas are dropped. At least three must
 * remain; past six, the rest are dropped.
 */
export function checkKeyIdeas(text: string, raw: RawKeyIdea[]): KeyIdeasResult {
  const inPassage = passageWords(text);
  const kept: KeyIdea[] = [];
  const seen = new Set<string>();
  for (const k of raw) {
    if (typeof k.idea !== 'string' || k.idea.trim() === '') continue;
    if (!Array.isArray(k.cues) || k.cues.length === 0) continue;
    if (k.cues.length > KEY_IDEA_RULES.maxGroups) continue;
    const cues = k.cues.map(cleanGroup);
    if (cues.some((g) => g === null)) continue;
    const groups = cues as string[][];
    if (!groups.every((g) => g.some((w) => inPassage.has(w)))) continue;
    const key = groups
      .map((g) => [...g].sort().join('|'))
      .sort()
      .join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({ idea: k.idea.trim(), cues: groups });
  }
  if (kept.length < KEY_IDEA_RULES.min) {
    return {
      ok: false,
      reason: `Only ${kept.length} valid key ideas; need at least ${KEY_IDEA_RULES.min}.`,
    };
  }
  const keyIdeas = kept.slice(0, KEY_IDEA_RULES.max);
  return { ok: true, keyIdeas, dropped: raw.length - keyIdeas.length };
}
