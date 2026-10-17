/**
 * Shape, length and tone checks for model output. Notes that fail any check are replaced by
 * standard wording; they are never repaired or shown.
 */
import { ModelNotes, type NotesFacts } from './schema';

export type ToneProblem = 'child_number' | 'child_score' | 'shaming' | 'promise' | 'unknown_number';

const NUMBER_WORDS =
  /\b(zero|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|half|percent)\b/i;
const SCORE_WORDS =
  /%|\b(score[sd]?|points?|marks?|grades?|out of|correct answers?|right answers?)\b/i;
const SHAMING =
  /\b(lazy|stupid|dumb|careless|bad|poor(ly)?|weak|fail(s|ed|ure)?|disappoint(ing|ed)?|not trying|should have known|behind)\b/i;
/** A promise is a future claim about a score, a level or passing. Code decides those, not notes. */
const PROMISE =
  /\b(will|you'll|you’ll|going to|guarantee[sd]?|sure to|certain to)\b[^.!?]*\b(level|score|pass|points|grade|move up)\b/i;

/** Tone problems in a set of notes. Empty when the notes are fine. */
export function toneProblems(n: ModelNotes, facts: NotesFacts): ToneProblem[] {
  const problems = new Set<ToneProblem>();
  const child = n.childMessage;
  if (/\d/.test(child) || NUMBER_WORDS.test(child)) problems.add('child_number');
  if (SCORE_WORDS.test(child)) problems.add('child_score');

  const all = [
    n.childMessage,
    n.whatHappened,
    n.whyFocus,
    n.homeActivity.title,
    n.homeActivity.tip,
    ...n.homeActivity.steps,
  ];
  if (all.some((t) => SHAMING.test(t))) problems.add('shaming');
  if (all.some((t) => PROMISE.test(t))) problems.add('promise');

  // The parent may see numbers, but only the ones code gave the model.
  const known = new Set(
    [
      facts.correct,
      facts.total,
      facts.total - facts.correct,
      facts.levelBefore,
      facts.levelAfter,
      facts.wordsRight,
      facts.wordsTotal,
      facts.missed.length,
      facts.flaggedWords.length,
      facts.wordsRight != null && facts.wordsTotal != null
        ? facts.wordsTotal - facts.wordsRight
        : null,
    ]
      .filter((v): v is number => v != null)
      .map(String),
  );
  const parent = `${n.whatHappened} ${n.whyFocus}`;
  const parentNumbers = parent.match(/\d+/g) ?? [];
  if (parentNumbers.some((d) => !known.has(d))) problems.add('unknown_number');
  // "X of Y" must be one of the real pairs, so a known number cannot stand in for another.
  const pairs = new Set([`${facts.correct}/${facts.total}`]);
  if (facts.wordsRight != null && facts.wordsTotal != null) {
    pairs.add(`${facts.wordsRight}/${facts.wordsTotal}`);
  }
  for (const m of parent.matchAll(/(\d+)\s+(?:of|out of)\s+(\d+)/g)) {
    if (!pairs.has(`${m[1]}/${m[2]}`)) problems.add('unknown_number');
  }

  return [...problems];
}

export type CheckResult =
  | { ok: true; notes: ModelNotes }
  | { ok: false; reason: 'invalid_shape' }
  | { ok: false; reason: 'tone'; problems: ToneProblem[] };

/** Shape and length first, then tone. */
export function checkNotes(raw: unknown, facts: NotesFacts): CheckResult {
  const parsed = ModelNotes.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalid_shape' };
  const problems = toneProblems(parsed.data, facts);
  if (problems.length) return { ok: false, reason: 'tone', problems };
  return { ok: true, notes: parsed.data };
}
