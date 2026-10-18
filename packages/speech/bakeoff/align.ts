/**
 * Simple alignments for the bake-off only. The real alignment engine is BB-25.
 * - alignToReference: LCS of passage words against heard words, then words left between two
 *   matches are paired in order as substitutions. This is how a provider's output would mark
 *   passage words right or wrong.
 * - editAlign: word-level Levenshtein, used for word error rate and confidence quality.
 */
import { normaliseWords } from './text.ts';
import type { HeardWord } from './types.ts';

export interface HeardToken {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

/** Normalise provider words. A word that normalises to several tokens shares its timing. */
export function toTokens(words: HeardWord[]): HeardToken[] {
  return words.flatMap((w) =>
    normaliseWords(w.text).map((text) => ({
      text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
  );
}

export type RefAlignment =
  { kind: 'match'; heard: number } | { kind: 'sub'; heard: number } | { kind: 'omit' };

export interface ReferenceAlignment {
  /** One entry per expected word. */
  words: RefAlignment[];
  /** Heard tokens that line up with no expected word. */
  insertions: number[];
}

export function alignToReference(expected: string[], heard: string[]): ReferenceAlignment {
  const n = expected.length;
  const m = heard.length;
  // lcs[i][j] = LCS length of expected[i..] and heard[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        expected[i] === heard[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (expected[i] === heard[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  const words: RefAlignment[] = new Array<RefAlignment>(n).fill({ kind: 'omit' });
  const insertions: number[] = [];
  const fillGap = (e0: number, e1: number, h0: number, h1: number) => {
    let e = e0;
    let h = h0;
    while (e < e1 && h < h1) words[e++] = { kind: 'sub', heard: h++ };
    while (h < h1) insertions.push(h++);
  };

  let prevE = 0;
  let prevH = 0;
  for (const [e, h] of pairs) {
    fillGap(prevE, e, prevH, h);
    words[e] = { kind: 'match', heard: h };
    prevE = e + 1;
    prevH = h + 1;
  }
  fillGap(prevE, n, prevH, m);
  return { words, insertions };
}

export type EditOp =
  | { op: 'eq'; ref: number; hyp: number }
  | { op: 'sub'; ref: number; hyp: number }
  | { op: 'del'; ref: number }
  | { op: 'ins'; hyp: number };

export interface EditAlignment {
  ops: EditOp[];
  substitutions: number;
  deletions: number;
  insertions: number;
  /** Number of reference words. */
  refLength: number;
}

export function editAlign(ref: string[], hyp: string[]): EditAlignment {
  const n = ref.length;
  const m = hyp.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j - 1]! + cost, d[i - 1]![j]! + 1, d[i]![j - 1]! + 1);
    }
  }

  const ops: EditOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i]![j] === d[i - 1]![j - 1]! + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      ops.push({ op: ref[i - 1] === hyp[j - 1] ? 'eq' : 'sub', ref: i - 1, hyp: j - 1 });
      i--;
      j--;
    } else if (i > 0 && d[i]![j] === d[i - 1]![j]! + 1) {
      ops.push({ op: 'del', ref: i - 1 });
      i--;
    } else {
      ops.push({ op: 'ins', hyp: j - 1 });
      j--;
    }
  }
  ops.reverse();
  return {
    ops,
    substitutions: ops.filter((o) => o.op === 'sub').length,
    deletions: ops.filter((o) => o.op === 'del').length,
    insertions: ops.filter((o) => o.op === 'ins').length,
    refLength: n,
  };
}
