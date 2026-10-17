/**
 * Alignment engine (BB-25, docs/PLAN.md section 8).
 * Lines up the words a learner should have said with the words the provider heard, then labels each
 * pair as correct, substitution, omission, insertion, repetition or self-correction.
 *
 * Shape of the output, which `summariseTry` relies on:
 * - one result per expected word, in order: correct, substitution or omission;
 * - extra heard words get their own results with `expected: null`: insertion, repetition or
 *   self_correction. The abandoned attempt is the self-correction, and the expected word that
 *   follows it is `correct`.
 *
 * Low-confidence words are flagged, never counted as errors:
 * - a low-confidence heard word that looks like an attempt at its expected word, but does not
 *   match it, is reported as `correct`. Read it as "unsure": `heard` differs from `expected` and
 *   `confidence` is below the threshold. `WordResult` has no separate flag, so use
 *   `isLowConfidence(confidence)`;
 * - a low-confidence word that looks nothing like the expected word is treated as noise. It never
 *   hides an omission, and it is dropped when it is an extra word.
 *
 * Contractions, split words and spoken numbers ("do not" for "don't", "twenty one" for 21) are
 * matched inside the alignment, in either direction, so a passage can hold both forms.
 */
import type { WordResult } from '@basabridge/contracts';
import type { HeardWord } from './index';
import { joinedKeys, keysMatch, MAX_JOIN, wordKeys } from './normalise';

/** Heard words below this confidence are flagged and never counted as errors. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}

// Edit costs. A substitution is cheaper than an omission plus an insertion, so a wrong word is
// reported as one substitution. A low-confidence word is cheap to pair with a word it resembles and
// dearer than an omission plus an insertion otherwise, so noise can never stand in for a skipped word.
const GAP = 2;
const SUBSTITUTE = 3;
const SUBSTITUTE_LOW_CONFIDENCE = 2;
const SUBSTITUTE_NOISE = 5;

interface Item {
  text: string;
  /** Keys of the word, best first. Never empty. */
  keys: string[];
}

interface Heard extends Item {
  word: HeardWord;
}

/** One step of the alignment. `en` or `hn` is 0 for an omission or an extra word. */
interface Op {
  e: number;
  en: number;
  h: number;
  hn: number;
}

const clamp = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, k) => k);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        previous[j]! + 1,
        row[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = row;
  }
  return previous[b.length]!;
}

/** True when the spoken word looks like a try at the target word. */
function looksLikeAttempt(spoken: string, target: string): boolean {
  const distance = editDistance(spoken, target);
  return (
    distance <= 1 ||
    (spoken[0] === target[0] && distance <= Math.floor(Math.max(spoken.length, target.length) / 2))
  );
}

/**
 * For each run size, the keys that the run ending at each position could join into, limited to keys
 * the other side actually has. Entry `[size][end]` is for items `end - size` up to `end - 1`.
 */
function joinTable(items: Item[], wanted: Set<string>): string[][][] {
  const table: string[][][] = [];
  for (let size = 2; size <= MAX_JOIN; size++) {
    table[size] = [];
    for (let end = size; end <= items.length; end++) {
      table[size]![end] = joinedKeys(
        items.slice(end - size, end).map((item) => item.keys[0]!),
      ).filter((key) => wanted.has(key));
    }
  }
  return table;
}

/** Minimum-cost alignment as a list of operations in reading order. */
function alignItems(expected: Item[], heard: Heard[]): Op[] {
  const n = expected.length;
  const m = heard.length;
  const width = m + 1;
  const cost = new Int32Array((n + 1) * width);
  for (let i = 1; i <= n; i++) cost[i * width] = i * GAP;
  for (let j = 1; j <= m; j++) cost[j] = j * GAP;

  const expectedWanted = new Set(expected.flatMap((item) => item.keys));
  const heardWanted = new Set(heard.flatMap((item) => item.keys));
  const heardJoins = joinTable(heard, expectedWanted);
  const expectedJoins = joinTable(expected, heardWanted);

  const pairCost = (i: number, j: number): number => {
    if (keysMatch(expected[i]!.keys, heard[j]!.keys)) return 0;
    if (!isLowConfidence(heard[j]!.word.confidence)) return SUBSTITUTE;
    return looksLikeAttempt(heard[j]!.keys[0]!, expected[i]!.keys[0]!)
      ? SUBSTITUTE_LOW_CONFIDENCE
      : SUBSTITUTE_NOISE;
  };
  /** Several heard words said for one expected word: "do not" for "don't". Free when they join. */
  const heardJoinFits = (i: number, j: number, size: number): boolean =>
    j >= size && heardJoins[size]![j]!.some((key) => expected[i]!.keys.includes(key));
  /** One heard word said for several expected words: "don't" for "do not". Free when it joins. */
  const expectedJoinFits = (i: number, j: number, size: number): boolean =>
    i >= size && expectedJoins[size]![i]!.some((key) => heard[j]!.keys.includes(key));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let best = Math.min(
        cost[(i - 1) * width + j - 1]! + pairCost(i - 1, j - 1),
        cost[(i - 1) * width + j]! + GAP,
        cost[i * width + j - 1]! + GAP,
      );
      for (let size = 2; size <= MAX_JOIN; size++) {
        if (heardJoinFits(i - 1, j, size)) best = Math.min(best, cost[(i - 1) * width + j - size]!);
        if (expectedJoinFits(i, j - 1, size))
          best = Math.min(best, cost[(i - size) * width + j - 1]!);
      }
      cost[i * width + j] = best;
    }
  }

  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const here = cost[i * width + j]!;
    if (i > 0 && j > 0 && here === cost[(i - 1) * width + j - 1]! + pairCost(i - 1, j - 1)) {
      ops.push({ e: i - 1, en: 1, h: j - 1, hn: 1 });
      i--;
      j--;
      continue;
    }
    let joined = false;
    for (let size = 2; size <= MAX_JOIN && !joined; size++) {
      if (i > 0 && heardJoinFits(i - 1, j, size) && here === cost[(i - 1) * width + j - size]!) {
        ops.push({ e: i - 1, en: 1, h: j - size, hn: size });
        i--;
        j -= size;
        joined = true;
      } else if (
        j > 0 &&
        expectedJoinFits(i, j - 1, size) &&
        here === cost[(i - size) * width + j - 1]!
      ) {
        ops.push({ e: i - size, en: size, h: j - 1, hn: 1 });
        i -= size;
        j--;
        joined = true;
      }
    }
    if (joined) continue;
    if (j > 0 && here === cost[i * width + j - 1]! + GAP) {
      ops.push({ e: i, en: 0, h: j - 1, hn: 1 });
      j--;
    } else {
      ops.push({ e: i - 1, en: 1, h: j, hn: 0 });
      i--;
    }
  }
  return ops.reverse();
}

type ExtraOutcome = 'insertion' | 'repetition' | 'self_correction';

/** A stutter is quick: the fragment ends almost as the real word starts. */
const STUTTER_MAX_GAP_SECONDS = 0.3;

/**
 * Label a run of extra heard words, indices `start` to `start + count - 1`.
 * `nextExpected` is the key of the expected word the next heard word was matched to, if it matched.
 */
function labelExtraRun(
  heard: Heard[],
  start: number,
  count: number,
  nextExpected: string | null,
): ExtraOutcome[] {
  const same = (from: number): boolean =>
    from >= 0 &&
    from + count <= heard.length &&
    Array.from({ length: count }).every(
      (_, t) => heard[from + t]!.keys[0] === heard[start + t]!.keys[0],
    );
  // A phrase said twice, before or after the matched copy: "the cat the cat sat".
  if (same(start - count) || same(start + count)) return Array(count).fill('repetition');

  return Array.from({ length: count }, (_, t): ExtraOutcome => {
    const w = start + t;
    const key = heard[w]!.keys[0]!;
    const previous = heard[w - 1]?.keys[0];
    const next = heard[w + 1];
    if (key === previous || key === next?.keys[0]) return 'repetition';
    // A stutter fragment: "b" just before "big".
    if (
      next &&
      next.keys[0]!.length > key.length &&
      next.keys[0]!.startsWith(key) &&
      next.word.start - heard[w]!.word.end <= STUTTER_MAX_GAP_SECONDS
    ) {
      return 'repetition';
    }
    if (t === count - 1 && nextExpected !== null && looksLikeAttempt(key, nextExpected)) {
      return 'self_correction';
    }
    return 'insertion';
  });
}

/** When a heard word was spoken, in seconds from the start of the recording. */
export interface HeardSpan {
  start: number;
  end: number;
}

/** Aligned words plus, for each result matched to heard words, when they were spoken. */
export interface TimedAlignment {
  results: WordResult[];
  /** Same length as `results`. Null for omissions and for words that are not on the passage. */
  spans: Array<HeardSpan | null>;
}

/** Compare the words that should have been said with the words heard. */
export function alignWords(expected: string[], heard: HeardWord[]): WordResult[] {
  return alignWordsTimed(expected, heard).results;
}

/**
 * Same alignment as `alignWords`, with the time of each matched word. Noise, off-passage words
 * and omissions carry no span, so reading time can be measured from the words actually read.
 */
export function alignWordsTimed(expected: string[], heard: HeardWord[]): TimedAlignment {
  // Stray punctuation tokens in the passage or from the provider are not words.
  const words: Item[] = expected
    .map((text) => ({ text, keys: wordKeys(text) }))
    .filter((item) => item.keys.length > 0);
  const spoken: Heard[] = heard
    .map((word) => ({ word, text: word.text, keys: wordKeys(word.text) }))
    .filter((item) => item.keys.length > 0);
  const ops = alignItems(words, spoken);

  const results: WordResult[] = [];
  const spans: Array<HeardSpan | null> = [];
  const spanOf = (group: Heard[]): HeardSpan => ({
    start: Math.min(...group.map((g) => g.word.start)),
    end: Math.max(...group.map((g) => g.word.end)),
  });
  const correct = (e: number, text: string, confidence: number, span: HeardSpan): void => {
    results.push({
      expected: words[e]!.text,
      heard: text,
      outcome: 'correct',
      confidence,
      markedMisheard: false,
    });
    spans.push(span);
  };

  for (let p = 0; p < ops.length;) {
    const op = ops[p]!;
    if (op.en > 0 && op.hn === 0) {
      // Nothing was heard, so there is no recognition doubt to flag.
      results.push({
        expected: words[op.e]!.text,
        heard: null,
        outcome: 'omission',
        confidence: 1,
        markedMisheard: false,
      });
      spans.push(null);
      p++;
    } else if (op.en === 1 && op.hn === 1) {
      const { word, keys } = spoken[op.h]!;
      const confidence = clamp(word.confidence);
      if (keysMatch(words[op.e]!.keys, keys) || isLowConfidence(confidence)) {
        correct(op.e, word.text, confidence, spanOf([spoken[op.h]!]));
      } else {
        results.push({
          expected: words[op.e]!.text,
          heard: word.text,
          outcome: 'substitution',
          confidence,
          markedMisheard: false,
        });
        spans.push(spanOf([spoken[op.h]!]));
      }
      p++;
    } else if (op.en > 0) {
      // Several heard words for one expected word, or one heard word for several expected words.
      const group = spoken.slice(op.h, op.h + op.hn);
      const confidence = clamp(Math.min(...group.map((g) => g.word.confidence)));
      const text = group.map((g) => g.word.text).join(' ');
      for (let e = op.e; e < op.e + op.en; e++) correct(e, text, confidence, spanOf(group));
      p++;
    } else {
      let q = p;
      while (q < ops.length && ops[q]!.en === 0) q++;
      const start = op.h;
      const count = q - p;
      const after = ops[q];
      const nextExpected =
        after &&
        after.en === 1 &&
        after.hn >= 1 &&
        keysMatch(words[after.e]!.keys, spoken[after.h]!.keys)
          ? words[after.e]!.keys[0]!
          : null;
      labelExtraRun(spoken, start, count, nextExpected).forEach((outcome, t) => {
        const { word } = spoken[start + t]!;
        const confidence = clamp(word.confidence);
        if (isLowConfidence(confidence)) return;
        results.push({
          expected: null,
          heard: word.text,
          outcome,
          confidence,
          markedMisheard: false,
        });
        spans.push(null);
      });
      p = q;
    }
  }
  return { results, spans };
}
