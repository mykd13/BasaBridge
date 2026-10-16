import type { Story } from '@basabridge/contracts';
import type { VerifyOutcome } from './verify';

type GoldStory = Pick<Story, 'text' | 'level' | 'questions'>;

/** One human-labelled case for measuring the verifier (BB-21 supplies the real gold set). */
export interface GoldCase {
  id: string;
  story: GoldStory;
  /** 1-based questions whose key a human planted wrong. */
  wrongKeys: number[];
  /** Human safety label. */
  unsafe: boolean;
}

export interface VerifierMeasurement {
  /** Of the planted wrong keys, the share the checker disagreed with. */
  wrongKeyCatchRate: number;
  /** Of the good keys, the share the checker wrongly disagreed with. */
  goodKeyFalseAlarmRate: number;
  /** Of the unsafe passages, the share the checker flagged. */
  unsafeCatchRate: number;
  /** Of the safe passages, the share the checker wrongly flagged. */
  safeFalseAlarmRate: number;
  cases: number;
}

const rate = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole);

const flaggedUnsafe = (o: VerifyOutcome): boolean =>
  !o.ok && o.kind === 'rejected' && o.record.outcome === 'rejected_unsafe';

/**
 * Runs the verifier over a human-checked set and reports catch and false-alarm rates.
 * A failed model call or invalid reply catches nothing, so it lowers the catch rates.
 * Counts only: nothing here logs passage or question text.
 */
export async function measureVerifier(
  cases: GoldCase[],
  verify: (story: GoldCase['story']) => Promise<VerifyOutcome>,
): Promise<VerifierMeasurement> {
  let wrongKeys = 0;
  let wrongCaught = 0;
  let goodKeys = 0;
  let goodAlarms = 0;
  let unsafe = 0;
  let unsafeCaught = 0;
  let safe = 0;
  let safeAlarms = 0;

  for (const c of cases) {
    const outcome = await verify(c.story);
    const disagreed = new Set(outcome.disagreed);

    c.story.questions.forEach((_, i) => {
      const n = i + 1;
      if (c.wrongKeys.includes(n)) {
        wrongKeys += 1;
        if (disagreed.has(n)) wrongCaught += 1;
      } else {
        goodKeys += 1;
        if (disagreed.has(n)) goodAlarms += 1;
      }
    });

    if (c.unsafe) {
      unsafe += 1;
      if (flaggedUnsafe(outcome)) unsafeCaught += 1;
    } else {
      safe += 1;
      if (flaggedUnsafe(outcome)) safeAlarms += 1;
    }
  }

  return {
    wrongKeyCatchRate: rate(wrongCaught, wrongKeys),
    goodKeyFalseAlarmRate: rate(goodAlarms, goodKeys),
    unsafeCatchRate: rate(unsafeCaught, unsafe),
    safeFalseAlarmRate: rate(safeAlarms, safe),
    cases: cases.length,
  };
}
