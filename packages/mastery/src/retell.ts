/**
 * Spoken retell scoring experiment (BB-46, docs/PLAN.md section 6.1). Pure functions: no AI, no I/O.
 * A retell is scored by which of the story's key ideas it mentions, using word matching only.
 * No model judges the child. Results are shown to nobody and never change a level: see RETELL.md
 * in this package for the gate that must pass first.
 *
 * Inputs are transcript words and key ideas only. Never pass names, usernames or audio.
 *
 * Known limits: negation is ignored ("did not fall" covers "fall"), word order is ignored, and
 * irregular forms (ran and run, fell and fall) only match when the cue group lists both.
 */

/** The part of a story key idea (packages/story-ai `KeyIdea`) that scoring uses. */
export interface RetellIdea {
  /** Each group is a set of words where any one counts. Every group must be matched. */
  cues: readonly (readonly string[])[];
}

export interface IdeaScore {
  covered: boolean;
  /** For each cue group, the cue word that matched, or null. */
  matched: (string | null)[];
}

export interface RetellScore {
  ideas: IdeaScore[];
  covered: number;
  total: number;
  /** covered / total, 0 when there are no ideas. */
  coverage: number;
}

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/**
 * Reduce a word to a rough stem so "mangoes", "mango", "falls" and "falling" meet. The same rule
 * runs on both sides, so it only needs to be consistent, not linguistically right.
 */
export function retellStem(word: string): string {
  let w = word
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/'s$/, '')
    .replace(/'/g, '');
  if (/^\d+$/.test(w)) w = NUMBER_WORDS[Number(w)] ?? w;
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (/(?:ss|sh|ch|x|z|o)es$/.test(w)) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) w = w.slice(0, -1);
  if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ied') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  if (/([b-df-hj-np-tv-z])\1$/.test(w) && !/(?:ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

/** Split transcript text into words. */
export function retellWords(transcript: string): string[] {
  return transcript.split(/\s+/).filter((w) => w !== '');
}

/** Score one retell against a story's key ideas. */
export function scoreRetell(
  transcript: readonly string[],
  keyIdeas: readonly RetellIdea[],
): RetellScore {
  const heard = new Set(transcript.map(retellStem).filter((s) => s !== ''));
  const ideas = keyIdeas.map((idea): IdeaScore => {
    const matched = idea.cues.map((group) => group.find((w) => heard.has(retellStem(w))) ?? null);
    return { covered: matched.length > 0 && matched.every((m) => m !== null), matched };
  });
  const covered = ideas.filter((i) => i.covered).length;
  return {
    ideas,
    covered,
    total: ideas.length,
    coverage: ideas.length === 0 ? 0 : covered / ideas.length,
  };
}
