/**
 * Reading-pattern aggregation (BB-27, docs/PLAN.md section 8, step 7).
 * Counts patterns across many tries from aligned words. Code finds and counts the patterns and sets
 * each confidence label; the AI step (BB-28) only explains them.
 *
 * Patterns:
 * - dropped_ending: an ending such as "ing" or "ed" was left off a word;
 * - letter_pattern: a wrong word where the expected word held a pattern (digraph, blend, vowel team)
 *   that the heard word does not;
 * - repeated_substitution: the same word said for the same expected word again and again;
 * - missing_pause: no pause after a full stop. Needs timings, so it only counts tries that bring them.
 *
 * Unclear audio is never an error: a word below the alignment confidence threshold is counted as
 * unclear, which lowers the confidence of the pattern it could have fed. Words marked misheard are
 * treated as read right. Omissions say nothing about how a word is decoded and are skipped.
 */
import type {
  PatternConfidence,
  PatternExample,
  ReadingPattern,
  ReadingPatternKind,
  ReadingPatterns,
  WordResult,
} from '@basabridge/contracts';
import { isLowConfidence } from './align';

/** One try, ready to aggregate. Holds words and counts only: no names, no audio. */
export interface TryEvidence {
  /** Any id the caller can map back to a try. Never a name or username. Unique within one call. */
  tryId: string;
  /** Output of `alignWords` for this try. The aligner keeps the written word, punctuation included. */
  words: WordResult[];
  /**
   * Seconds of silence after each aligned expected word. The index counts the results of
   * `alignWords` that have an `expected` word, in order, omissions included. The aligner drops
   * passage tokens with no letters or digits (a lone dash), so index the aligned words, not the
   * passage tokens. `null` or missing when unknown. Leave it out when the provider gives no timings.
   */
  pausesAfter?: (number | null)[];
}

/** A pattern needs at least this many hits before it is reported. One slip is not a pattern. */
export const MIN_PATTERN_COUNT = 2;
/**
 * A pause shorter than this after a full stop counts as missing. A first guess: tie it, and the
 * confidence numbers below, to the pace review in BB-40 before launch.
 */
export const MIN_PAUSE_SECONDS = 0.25;
/** When more than this share of the evidence is unclear, confidence drops one step. */
export const UNCLEAR_SHARE_LIMIT = 0.3;
/** Hit rate that a "high" pattern must reach. */
export const HIGH_CONFIDENCE_RATE = 0.5;
/** Below this hit rate a pattern stays "low", however many tries it appears in. */
export const MEDIUM_CONFIDENCE_RATE = 0.2;
export const HIGH_CONFIDENCE_TRIES = 3;
export const HIGH_CONFIDENCE_COUNT = 4;
const MAX_EXAMPLES = 5;

/** Longest first, so "es" wins over "s". */
const ENDINGS = ['ing', 'est', 'ed', 'es', 'ly', 'er', 's'];

/** Words that end in an ending's letters but do not carry that ending. */
const NOT_INFLECTED = new Set([
  // s
  'this',
  'thus',
  'plus',
  'always',
  'perhaps',
  'across',
  'famous',
  // er
  'never',
  'after',
  'under',
  'other',
  'mother',
  'father',
  'brother',
  'sister',
  'water',
  'paper',
  'together',
  'another',
  'whether',
  'either',
  'neither',
  'finger',
  'river',
  'number',
  'letter',
  'dinner',
  'summer',
  'winter',
  'flower',
  'power',
  'order',
  'wonder',
  'corner',
  'answer',
  'ladder',
  'silver',
  // ed
  'hundred',
  'sacred',
  // ly
  'family',
  'early',
  'only',
  'belly',
  'jelly',
  'ugly',
  'reply',
  'supply',
  'apply',
  // est
  'forest',
  'interest',
  'honest',
  'guest',
  'request',
  // ing
  'morning',
  'evening',
  'during',
  'ceiling',
  'something',
  'nothing',
  'anything',
  'everything',
]);

/** Written forms that look like a full stop but are not the end of a sentence. */
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'sr', 'jr', 'prof', 'vs', 'etc']);

/** True when the written word ends a sentence: not an abbreviation, initial or ellipsis. */
function endsSentence(written: string): boolean {
  // Closing quotes and brackets may follow the stop, straight or curly.
  if (!/[.!?]["'”’)\]]*$/.test(written)) return false;
  if (/\.\.\.|…/.test(written)) return false;
  const bare = written.replace(/[^A-Za-z.]/g, '');
  if (/^[A-HJ-Z]\.$/.test(bare)) return false; // an initial: "J." ("I." can end a sentence)
  return !(written.endsWith('.') && ABBREVIATIONS.has(normal(written)));
}

const LETTER_PATTERNS = [
  // digraphs and silent-letter pairs
  'th',
  'sh',
  'ch',
  'wh',
  'ph',
  'ck',
  'ng',
  'kn',
  'wr',
  // longer chunks
  'igh',
  'tion',
  'ough',
  // vowel teams
  'ee',
  'ea',
  'oa',
  'oo',
  'ai',
  'ay',
  'ou',
  'ow',
  // blends
  'bl',
  'br',
  'cl',
  'cr',
  'dr',
  'fl',
  'fr',
  'gl',
  'gr',
  'pl',
  'pr',
  'sc',
  'sk',
  'sl',
  'sm',
  'sn',
  'sp',
  'st',
  'sw',
  'tr',
  'tw',
];

/** Lower case letters and inner apostrophes, so "we'll" stays apart from "well". */
const normal = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z']/g, '')
    .replace(/^'+|'+$/g, '');

/** True when the heard word looks like a try at the expected word, not a skip or a wild guess. */
const looksLikeAttempt = (heard: string, expected: string): boolean =>
  heard[0] === expected[0] || (heard.length > 1 && heard.slice(-2) === expected.slice(-2));

interface Tally {
  kind: ReadingPatternKind;
  key: string;
  count: number;
  opportunities: number;
  unclear: number;
  tryIds: Set<string>;
  examples: PatternExample[];
}

class Tallies {
  private readonly map = new Map<string, Tally>();

  get(kind: ReadingPatternKind, key: string): Tally {
    const id = `${kind}:${key}`;
    let tally = this.map.get(id);
    if (!tally) {
      tally = {
        kind,
        key,
        count: 0,
        opportunities: 0,
        unclear: 0,
        tryIds: new Set(),
        examples: [],
      };
      this.map.set(id, tally);
    }
    return tally;
  }

  /** Record a chance for the pattern. `hit` is true when it happened. */
  see(
    kind: ReadingPatternKind,
    key: string,
    tryId: string,
    unclear: boolean,
    hit: boolean,
    example: PatternExample,
  ): void {
    const tally = this.get(kind, key);
    if (unclear) {
      tally.unclear += 1;
      return;
    }
    tally.opportunities += 1;
    if (hit) this.hit(tally, tryId, example);
  }

  /** Record a hit without a chance, for patterns whose chances are counted separately. */
  hit(tally: Tally, tryId: string, example: PatternExample): void {
    tally.count += 1;
    tally.tryIds.add(tryId);
    const seen = tally.examples.some(
      (e) => e.expected === example.expected && e.heard === example.heard,
    );
    if (!seen) tally.examples.push(example);
  }

  all(): Tally[] {
    return [...this.map.values()];
  }
}

/**
 * The ending a word carries, or null when it only ends in the same letters ("his", "thing"). The
 * rest must look like a word: three or more letters with a vowel, and not a known exception.
 */
function endingOf(expected: string): string | null {
  if (NOT_INFLECTED.has(expected) || expected.includes("'")) return null; // "it's" is not a plural
  for (const ending of ENDINGS) {
    if (!expected.endsWith(ending)) continue;
    const stem = expected.slice(0, -ending.length);
    if (stem.length < 3 || !/[aeiouy]/.test(stem)) continue;
    if (ending === 's' && /(s|u|i)$/.test(stem)) continue; // "glass", "bus", "this"
    return ending;
  }
  return null;
}

/** What the word is without its ending: "run" for "running", "make" for "making", "story" for "stories". */
function stemsOf(expected: string, ending: string): string[] {
  const stem = expected.slice(0, -ending.length);
  const stems = [stem, `${stem}e`];
  if (stem.length > 2 && stem.at(-1) === stem.at(-2)) stems.push(stem.slice(0, -1));
  if (stem.endsWith('i')) stems.push(`${stem.slice(0, -1)}y`);
  return stems;
}

const RANK: Record<PatternConfidence, number> = { low: 0, medium: 1, high: 2 };
const STEP_DOWN: Record<PatternConfidence, PatternConfidence> = {
  high: 'medium',
  medium: 'low',
  low: 'low',
};

/** The confidence label for a pattern. Pure and deterministic. */
export function patternConfidence(input: {
  count: number;
  tries: number;
  opportunities: number;
  unclearWords: number;
}): PatternConfidence {
  const rate = input.opportunities > 0 ? input.count / input.opportunities : 0;
  let label: PatternConfidence = 'low';
  if (
    input.tries >= HIGH_CONFIDENCE_TRIES &&
    input.count >= HIGH_CONFIDENCE_COUNT &&
    rate >= HIGH_CONFIDENCE_RATE
  ) {
    label = 'high';
  } else if (input.tries >= 2 && rate >= MEDIUM_CONFIDENCE_RATE) {
    label = 'medium';
  }
  const seen = input.opportunities + input.unclearWords;
  if (seen > 0 && input.unclearWords / seen > UNCLEAR_SHARE_LIMIT) label = STEP_DOWN[label];
  return label;
}

export function aggregateReadingPatterns(tries: TryEvidence[]): ReadingPatterns {
  const ids = new Set(tries.map((t) => t.tryId));
  if (ids.size !== tries.length) {
    throw new Error('aggregateReadingPatterns: every try needs its own tryId');
  }

  const tallies = new Tallies();
  let unclearWords = 0;
  /** Clear reads of each expected word, the chances for a repeated substitution. */
  const clearReads = new Map<string, number>();

  for (const evidence of tries) {
    let index = -1;
    const expectedCount = evidence.words.filter((w) => w.expected !== null).length;
    for (const word of evidence.words) {
      if (word.expected === null) continue;
      index += 1;
      if (word.outcome === 'omission' || word.markedMisheard) continue;

      const expected = normal(word.expected);
      const heard = word.heard === null ? null : normal(word.heard);
      if (expected.length === 0) continue;

      // Unclear audio: low confidence on a word whose text does not match. A low-confidence word
      // that matches was still read right, so it is a normal chance.
      const textDiffers = heard !== null && heard.length > 0 && heard !== expected;
      const unclear = textDiffers && isLowConfidence(word.confidence);
      if (unclear) unclearWords += 1;

      const example: PatternExample = { expected, heard };
      // A clear word is wrong only when the aligner says so: it reports joined forms such as "do not"
      // for "don't" as correct, with different text. An unclear one is kept so it can lower confidence.
      const differs = textDiffers && (unclear || word.outcome === 'substitution');

      // Dropped endings.
      const ending = endingOf(expected);
      const droppedEnding =
        ending !== null && differs && stemsOf(expected, ending).includes(heard!);
      if (ending !== null)
        tallies.see('dropped_ending', ending, evidence.tryId, unclear, droppedEnding, example);

      // Letter patterns. A dropped ending already explains the word, so it is not blamed twice, and
      // a word that looks nothing like the expected one is a skip or a guess, not a letter problem.
      if (!droppedEnding) {
        for (const letters of LETTER_PATTERNS) {
          if (!expected.includes(letters)) continue;
          const hit = differs && looksLikeAttempt(heard!, expected) && !heard!.includes(letters);
          tallies.see('letter_pattern', letters, evidence.tryId, unclear, hit, example);
        }
      }

      // Repeated substitutions: the same expected word, said the same wrong way. A dropped ending
      // already explains the word, so it is not reported a second time.
      // The chances are every clear read of the word, counted once all tries are in.
      if (!unclear) clearReads.set(expected, (clearReads.get(expected) ?? 0) + 1);
      if (differs && !droppedEnding) {
        const tally = tallies.get('repeated_substitution', `${expected}>${heard}`);
        if (unclear) tally.unclear += 1;
        else tallies.hit(tally, evidence.tryId, example);
      }

      // Pauses at full stops.
      const written = word.expected;
      const pause = evidence.pausesAfter?.[index];
      const isLast = index === expectedCount - 1;
      if (endsSentence(written) && !isLast && pause !== undefined && pause !== null) {
        tallies.see(
          'missing_pause',
          'full_stop',
          evidence.tryId,
          unclear,
          pause < MIN_PAUSE_SECONDS,
          example,
        );
      }
    }
  }

  for (const t of tallies.all()) {
    if (t.kind === 'repeated_substitution') {
      t.opportunities = clearReads.get(t.key.split('>')[0]!) ?? 0;
    }
  }

  // Everything below sorts, so the same tries give the same output in any order.
  const patterns: ReadingPattern[] = tallies
    .all()
    .filter((t) => t.count >= MIN_PATTERN_COUNT)
    .map((t) => {
      const tryIds = [...t.tryIds].sort();
      const tally = {
        count: t.count,
        tries: tryIds.length,
        opportunities: t.opportunities,
        unclearWords: t.unclear,
      };
      const examples = [...t.examples]
        .sort(
          (a, b) =>
            a.expected.localeCompare(b.expected) || (a.heard ?? '').localeCompare(b.heard ?? ''),
        )
        .slice(0, MAX_EXAMPLES);
      return {
        kind: t.kind,
        key: t.key,
        ...tally,
        tryIds,
        confidence: patternConfidence(tally),
        examples,
      };
    })
    .sort(
      (a, b) =>
        RANK[b.confidence] - RANK[a.confidence] ||
        b.count - a.count ||
        b.tries - a.tries ||
        a.kind.localeCompare(b.kind) ||
        a.key.localeCompare(b.key),
    );

  return { triesAnalysed: tries.length, unclearWords, patterns };
}
