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
  /** Any id the caller can map back to a try. Never a name or username. */
  tryId: string;
  /** The passage words as written, punctuation kept, in order. Used to find full stops. */
  expected: string[];
  /** Output of `alignWords` for this try. */
  words: WordResult[];
  /**
   * Seconds of silence after each expected word, by expected-word index. `null` or missing when
   * unknown. Leave it out when the provider gives no timings.
   */
  pausesAfter?: (number | null)[];
}

/** A pattern needs at least this many hits before it is reported. One slip is not a pattern. */
export const MIN_PATTERN_COUNT = 2;
/** A pause shorter than this after a full stop counts as missing. */
export const MIN_PAUSE_SECONDS = 0.25;
/** When more than this share of the evidence is unclear, confidence drops one step. */
export const UNCLEAR_SHARE_LIMIT = 0.3;
/** Hit rate that a "high" pattern must reach. */
export const HIGH_CONFIDENCE_RATE = 0.5;
export const HIGH_CONFIDENCE_TRIES = 3;
export const HIGH_CONFIDENCE_COUNT = 4;
const MAX_EXAMPLES = 5;

/** Longest first, so "es" wins over "s". */
const ENDINGS = ['ing', 'est', 'ed', 'es', 'ly', 'er', 's'];

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

const normal = (text: string): string => text.toLowerCase().replace(/[^a-z]/g, '');

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
    state: 'clear' | 'unclear',
    hit: boolean,
    example: PatternExample,
  ): void {
    const tally = this.get(kind, key);
    if (state === 'unclear') {
      tally.unclear += 1;
      return;
    }
    tally.opportunities += 1;
    if (!hit) return;
    tally.count += 1;
    tally.tryIds.add(tryId);
    const seen = tally.examples.some(
      (e) => e.expected === example.expected && e.heard === example.heard,
    );
    if (!seen && tally.examples.length < MAX_EXAMPLES) tally.examples.push(example);
  }

  all(): Tally[] {
    return [...this.map.values()];
  }
}

function endingOf(expected: string): string | null {
  return (
    ENDINGS.find((ending) => expected.length >= ending.length + 2 && expected.endsWith(ending)) ??
    null
  );
}

/** What the word is without its ending: "run" for "running", "make" for "making". */
function stemsOf(expected: string, ending: string): string[] {
  const stem = expected.slice(0, -ending.length);
  const stems = [stem, `${stem}e`];
  if (stem.length > 2 && stem.at(-1) === stem.at(-2)) stems.push(stem.slice(0, -1));
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
  } else if (input.tries >= 2) {
    label = 'medium';
  }
  const seen = input.opportunities + input.unclearWords;
  if (seen > 0 && input.unclearWords / seen > UNCLEAR_SHARE_LIMIT) label = STEP_DOWN[label];
  return label;
}

export function aggregateReadingPatterns(tries: TryEvidence[]): ReadingPatterns {
  const tallies = new Tallies();
  let unclearWords = 0;

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

      const unclear = isLowConfidence(word.confidence);
      const state = unclear ? 'unclear' : 'clear';
      if (unclear) unclearWords += 1;

      const example: PatternExample = { expected, heard };
      const differs = heard !== null && heard.length > 0 && heard !== expected;

      // Dropped endings.
      const ending = endingOf(expected);
      const droppedEnding =
        ending !== null && differs && stemsOf(expected, ending).includes(heard!);
      if (ending !== null)
        tallies.see('dropped_ending', ending, evidence.tryId, state, droppedEnding, example);

      // Letter patterns. A dropped ending already explains the word, so it is not blamed twice.
      if (!droppedEnding) {
        for (const letters of LETTER_PATTERNS) {
          if (!expected.includes(letters)) continue;
          const hit = differs && !heard!.includes(letters);
          tallies.see('letter_pattern', letters, evidence.tryId, state, hit, example);
        }
      }

      // Repeated substitutions: the same expected word, said the same wrong way.
      if (differs) {
        tallies.see(
          'repeated_substitution',
          `${expected}>${heard}`,
          evidence.tryId,
          state,
          true,
          example,
        );
      }

      // Pauses at full stops.
      const written = evidence.expected[index] ?? word.expected;
      const pause = evidence.pausesAfter?.[index];
      const isLast = index === expectedCount - 1;
      if (/[.!?]["')\]]*$/.test(written) && !isLast && pause !== undefined && pause !== null) {
        tallies.see(
          'missing_pause',
          'full_stop',
          evidence.tryId,
          state,
          pause < MIN_PAUSE_SECONDS,
          example,
        );
      }
    }
  }

  const patterns: ReadingPattern[] = tallies
    .all()
    .filter((t) => t.count >= MIN_PATTERN_COUNT)
    .map((t) => {
      const tryIds = [...t.tryIds];
      const tally = {
        count: t.count,
        tries: tryIds.length,
        opportunities: t.opportunities,
        unclearWords: t.unclear,
      };
      return {
        kind: t.kind,
        key: t.key,
        ...tally,
        tryIds,
        confidence: patternConfidence(tally),
        examples: t.examples,
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
