/** Per-recording scores. Aggregation and the report live in report.ts. */
import { alignToReference, editAlign, toTokens } from './align.ts';
import { verdictOf } from './types.ts';
import type { AssessedWord, HeardWord, TruthRow } from './types.ts';

/** Confidence thresholds below which a heard substitution is flagged instead of counted. */
export const FLAG_THRESHOLDS = [0.3, 0.5, 0.7, 0.9] as const;

export interface ErrorCounts {
  /** Passage words the human marked as read correctly that the provider would mark wrong. */
  falseErrors: number;
  /** Passage words the human marked as read correctly (unclear words excluded). */
  readWords: number;
  /** Passage words the human marked as misread that the provider would accept. */
  missedErrors: number;
  /** Passage words the human marked as misread. */
  miscueWords: number;
}

export interface RecordingScore {
  /** Word error rate parts against what was actually said. */
  wordEdits: number;
  wordRefLength: number;
  /** Provider words marked against the passage with the LCS alignment. */
  errors: ErrorCounts;
  /** Same, when substitutions below each threshold are flagged rather than counted. */
  flagged: Record<number, ErrorCounts>;
  /** The provider's own miscue verdicts, when it does reading assessment. */
  assessment: ErrorCounts | null;
  /** Absolute start and end differences in ms, for words with human timestamps. */
  startErrorsMs: number[];
  endErrorsMs: number[];
  /** Per heard word: confidence and whether it was wrong against what was said. */
  confidence: number[];
  wrong: boolean[];
}

const emptyCounts = (): ErrorCounts => ({
  falseErrors: 0,
  readWords: 0,
  missedErrors: 0,
  miscueWords: 0,
});

/** Human verdict per passage word, in passage order. */
export function referenceVerdicts(rows: TruthRow[]) {
  return rows
    .filter((r) => r.index !== null)
    .map((r) => ({ row: r, verdict: verdictOf(r.outcome) }));
}

function countErrors(
  verdicts: ReturnType<typeof referenceVerdicts>,
  providerSaysError: (index: number) => boolean,
): ErrorCounts {
  const c = emptyCounts();
  verdicts.forEach(({ verdict }, i) => {
    if (verdict === 'read') {
      c.readWords++;
      if (providerSaysError(i)) c.falseErrors++;
    } else if (verdict === 'miscue') {
      c.miscueWords++;
      if (!providerSaysError(i)) c.missedErrors++;
    }
  });
  return c;
}

export function scoreRecording(
  passageWords: string[],
  rows: TruthRow[],
  heard: HeardWord[],
  assessment?: AssessedWord[],
): RecordingScore {
  const tokens = toTokens(heard);
  const heardTexts = tokens.map((t) => t.text);
  const verdicts = referenceVerdicts(rows);
  const ref = alignToReference(passageWords, heardTexts);

  const errors = countErrors(verdicts, (i) => ref.words[i]!.kind !== 'match');

  const flagged: Record<number, ErrorCounts> = {};
  for (const t of FLAG_THRESHOLDS) {
    flagged[t] = countErrors(verdicts, (i) => {
      const a = ref.words[i]!;
      if (a.kind === 'match') return false;
      if (a.kind === 'omit') return true;
      return tokens[a.heard]!.confidence >= t;
    });
  }

  const assessed =
    assessment && assessment.length === passageWords.length
      ? countErrors(verdicts, (i) => assessment[i] === 'miscue')
      : null;

  const startErrorsMs: number[] = [];
  const endErrorsMs: number[] = [];
  verdicts.forEach(({ row }, i) => {
    const a = ref.words[i]!;
    if (row.outcome !== 'correct' || row.start === null || row.end === null) return;
    if (a.kind !== 'match') return;
    const tok = tokens[a.heard]!;
    startErrorsMs.push(Math.abs(tok.start - row.start) * 1000);
    endErrorsMs.push(Math.abs(tok.end - row.end) * 1000);
  });

  const verbatim = rows.flatMap((r) => r.said);
  const edit = editAlign(verbatim, heardTexts);
  const wrong = new Array<boolean>(tokens.length).fill(false);
  for (const op of edit.ops) {
    if (op.op === 'sub' || op.op === 'ins') wrong[op.hyp] = true;
  }

  return {
    wordEdits: edit.substitutions + edit.deletions + edit.insertions,
    wordRefLength: edit.refLength,
    errors,
    flagged,
    assessment: assessed,
    startErrorsMs,
    endErrorsMs,
    confidence: tokens.map((t) => t.confidence),
    wrong,
  };
}
