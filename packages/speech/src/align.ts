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
 * - a low-confidence heard word that does not match its expected word is reported as `correct`,
 *   with its heard text and low confidence kept so the screen can flag it;
 * - a low-confidence extra word (background speech, noise) is dropped.
 */
import type { WordResult } from '@basabridge/contracts';
import type { HeardWord } from './index';
import { joinedKeys, wordKey } from './normalise';

/** Heard words below this confidence are flagged and never counted as errors. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function isLowConfidence(confidence: number): boolean {
  return confidence < LOW_CONFIDENCE_THRESHOLD;
}

// Edit costs. A substitution is cheaper than an omission plus an insertion, so a wrong word is
// reported as one substitution. A low-confidence word is the cheapest to pair with anything.
const GAP = 2;
const SUBSTITUTE = 3;
const SUBSTITUTE_LOW_CONFIDENCE = 2;

interface Heard {
  word: HeardWord;
  key: string;
}

interface Op {
  /** Index into the expected keys, or -1 for an extra heard word. */
  e: number;
  /** Index into the prepared heard words, or -1 for an omission. */
  h: number;
}

/** Normalise heard words, drop stray punctuation and join words the provider split apart. */
function prepareHeard(heard: HeardWord[], expectedKeys: Set<string>): Heard[] {
  const items = heard
    .map((word) => ({ word, key: wordKey(word.text) }))
    .filter((item) => item.key !== '');
  const out: Heard[] = [];
  for (let i = 0; i < items.length;) {
    let merged: Heard | null = null;
    for (let size = Math.min(3, items.length - i); size >= 2 && !merged; size--) {
      const run = items.slice(i, i + size);
      const key = joinedKeys(run.map((r) => r.key)).find((k) => expectedKeys.has(k));
      if (key) {
        merged = {
          key,
          word: {
            text: run.map((r) => r.word.text).join(' '),
            start: run[0]!.word.start,
            end: run[size - 1]!.word.end,
            confidence: Math.min(...run.map((r) => r.word.confidence)),
          },
        };
        i += size;
      }
    }
    if (merged) out.push(merged);
    else out.push(items[i++]!);
  }
  return out;
}

/** Minimum-cost alignment as a list of operations in reading order. */
function alignKeys(expected: string[], heard: Heard[]): Op[] {
  const n = expected.length;
  const m = heard.length;
  const width = m + 1;
  const cost = new Int32Array((n + 1) * width);
  for (let i = 1; i <= n; i++) cost[i * width] = i * GAP;
  for (let j = 1; j <= m; j++) cost[j] = j * GAP;
  const pairCost = (i: number, j: number): number =>
    expected[i] === heard[j]!.key
      ? 0
      : isLowConfidence(heard[j]!.word.confidence)
        ? SUBSTITUTE_LOW_CONFIDENCE
        : SUBSTITUTE;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diagonal = cost[(i - 1) * width + j - 1]! + pairCost(i - 1, j - 1);
      const skipExpected = cost[(i - 1) * width + j]! + GAP;
      const skipHeard = cost[i * width + j - 1]! + GAP;
      cost[i * width + j] = Math.min(diagonal, skipExpected, skipHeard);
    }
  }

  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const here = cost[i * width + j]!;
    if (i > 0 && j > 0 && here === cost[(i - 1) * width + j - 1]! + pairCost(i - 1, j - 1)) {
      ops.push({ e: i - 1, h: j - 1 });
      i--;
      j--;
    } else if (j > 0 && here === cost[i * width + j - 1]! + GAP) {
      ops.push({ e: -1, h: j - 1 });
      j--;
    } else {
      ops.push({ e: i - 1, h: -1 });
      i--;
    }
  }
  return ops.reverse();
}

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

/** True when the spoken word looks like a failed try at the expected word. */
function looksLikeAttempt(spoken: string, target: string): boolean {
  const distance = editDistance(spoken, target);
  return (
    distance <= 1 ||
    (spoken[0] === target[0] && distance <= Math.floor(Math.max(spoken.length, target.length) / 2))
  );
}

type ExtraOutcome = 'insertion' | 'repetition' | 'self_correction';

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
    Array.from({ length: count }).every((_, t) => heard[from + t]!.key === heard[start + t]!.key);
  // A phrase said twice, before or after the matched copy: "the cat the cat sat".
  if (same(start - count) || same(start + count)) return Array(count).fill('repetition');

  return Array.from({ length: count }, (_, t): ExtraOutcome => {
    const w = start + t;
    const key = heard[w]!.key;
    const previous = heard[w - 1]?.key;
    const next = heard[w + 1]?.key;
    if (key === previous || key === next) return 'repetition';
    // A stutter fragment: "b" before "big".
    if (next !== undefined && next.length > key.length && next.startsWith(key)) return 'repetition';
    if (t === count - 1 && nextExpected !== null && looksLikeAttempt(key, nextExpected)) {
      return 'self_correction';
    }
    return 'insertion';
  });
}

/** Compare the words that should have been said with the words heard. */
export function alignWords(expected: string[], heard: HeardWord[]): WordResult[] {
  // Stray punctuation tokens in the passage are not words to read.
  const words = expected
    .map((text) => ({ text, key: wordKey(text) }))
    .filter((word) => word.key !== '');
  const expectedKeys = words.map((word) => word.key);
  const prepared = prepareHeard(heard, new Set(expectedKeys));
  const ops = alignKeys(expectedKeys, prepared);

  const results: WordResult[] = [];
  const clamp = (value: number): number => Math.min(1, Math.max(0, value));

  for (let p = 0; p < ops.length;) {
    const op = ops[p]!;
    if (op.e >= 0 && op.h < 0) {
      // Nothing was heard, so there is no recognition doubt to flag.
      results.push({
        expected: words[op.e]!.text,
        heard: null,
        outcome: 'omission',
        confidence: 1,
        markedMisheard: false,
      });
      p++;
    } else if (op.e >= 0) {
      const { word, key } = prepared[op.h]!;
      const confidence = clamp(word.confidence);
      const matched = key === expectedKeys[op.e] || isLowConfidence(confidence);
      results.push({
        expected: words[op.e]!.text,
        heard: word.text,
        outcome: matched ? 'correct' : 'substitution',
        confidence,
        markedMisheard: false,
      });
      p++;
    } else {
      let q = p;
      while (q < ops.length && ops[q]!.e < 0) q++;
      const start = op.h;
      const count = q - p;
      const after = ops[q];
      const nextExpected =
        after && after.e >= 0 && after.h >= 0 && prepared[after.h]!.key === expectedKeys[after.e]
          ? expectedKeys[after.e]!
          : null;
      const labels = labelExtraRun(prepared, start, count, nextExpected);
      labels.forEach((outcome, t) => {
        const { word } = prepared[start + t]!;
        const confidence = clamp(word.confidence);
        if (isLowConfidence(confidence)) return;
        results.push({
          expected: null,
          heard: word.text,
          outcome,
          confidence,
          markedMisheard: false,
        });
      });
      p = q;
    }
  }
  return results;
}
