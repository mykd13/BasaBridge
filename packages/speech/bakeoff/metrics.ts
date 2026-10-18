/** Per-recording scores. Aggregation and the report live in report.ts. */
import { alignWords } from '../src/align.ts';
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
  /**
   * Provider words marked by the app's own alignment engine (BB-25), which is what a learner
   * would see. Null if the engine did not return one result per passage word.
   */
  engine: ErrorCounts | null;
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

/**
 * Run the BB-25 engine and count its verdicts. A provider without real per-word confidence gets
 * confidence 1 on every word, so the engine never flags its placeholder numbers as unsure.
 */
function engineErrors(
  passageWords: string[],
  verdicts: ReturnType<typeof referenceVerdicts>,
  heard: HeardWord[],
  hasWordConfidence: boolean,
): ErrorCounts | null {
  const words = hasWordConfidence ? heard : heard.map((w) => ({ ...w, confidence: 1 }));
  const perPassageWord = alignWords(passageWords, words).filter((r) => r.expected !== null);
  if (perPassageWord.length !== passageWords.length) return null;
  return countErrors(verdicts, (i) => perPassageWord[i]!.outcome !== 'correct');
}

export function scoreRecording(
  passageWords: string[],
  rows: TruthRow[],
  heard: HeardWord[],
  assessment?: AssessedWord[],
  hasWordConfidence = true,
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
    engine: engineErrors(passageWords, verdicts, heard, hasWordConfidence),
    assessment: assessed,
    startErrorsMs,
    endErrorsMs,
    confidence: tokens.map((t) => t.confidence),
    wrong,
  };
}
